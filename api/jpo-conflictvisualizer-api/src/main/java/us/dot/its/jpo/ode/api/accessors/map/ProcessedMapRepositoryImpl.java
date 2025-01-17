package us.dot.its.jpo.ode.api.accessors.map;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.bson.Document;
import org.bson.conversions.Bson;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOptions;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.aggregation.ArithmeticOperators;
import org.springframework.data.mongodb.core.aggregation.ConvertOperators;
import org.springframework.data.mongodb.core.aggregation.DateOperators;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.client.DistinctIterable;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.model.Projections;
import com.mongodb.client.model.Sorts;

import static com.mongodb.client.model.Filters.eq;

import us.dot.its.jpo.geojsonconverter.pojos.geojson.map.ProcessedMap;
import us.dot.its.jpo.ode.api.ConflictMonitorApiProperties;
import us.dot.its.jpo.ode.api.models.IDCount;
import us.dot.its.jpo.ode.api.models.IntersectionReferenceData;
import us.dot.its.jpo.geojsonconverter.DateJsonMapper;
import us.dot.its.jpo.geojsonconverter.pojos.geojson.LineString;

@Component
public class ProcessedMapRepositoryImpl implements ProcessedMapRepository {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    ConflictMonitorApiProperties props;

    private String collectionName = "ProcessedMap";
    private ObjectMapper mapper = DateJsonMapper.getInstance();

    public Query getQuery(Integer intersectionID, Long startTime, Long endTime, boolean latest) {
        Query query = new Query();

        if (intersectionID != null) {
            query.addCriteria(Criteria.where("properties.intersectionId").is(intersectionID));
        }

        String startTimeString = Instant.ofEpochMilli(0).toString();
        String endTimeString = Instant.now().toString();

        if (startTime != null) {
            startTimeString = Instant.ofEpochMilli(startTime).toString();
        }
        if (endTime != null) {
            endTimeString = Instant.ofEpochMilli(endTime).toString();
        }

        if (latest) {
            query.with(Sort.by(Sort.Direction.DESC, "properties.timeStamp"));
            query.limit(1);
        }else{
            query.limit(props.getMaximumResponseSize());
        }

        query.addCriteria(Criteria.where("properties.timeStamp").gte(startTimeString).lte(endTimeString));
        query.fields().exclude("recordGeneratedAt");
        return query;
    }

    public long getQueryResultCount(Query query) {
        return mongoTemplate.count(query, ProcessedMap.class, collectionName);
    }

    public List<ProcessedMap> findProcessedMaps(Query query) {
        List<Map> documents = mongoTemplate.find(query, Map.class, collectionName);
        List<ProcessedMap> convertedList = new ArrayList<>();
        for (Map document : documents) {
            document.remove("_id");
            ProcessedMap bsm = mapper.convertValue(document, ProcessedMap.class);
            convertedList.add(bsm);
        }
        return convertedList;
    }

    public List<IntersectionReferenceData> getIntersectionIDs() {
        MongoCollection<Document> collection = mongoTemplate.getCollection(collectionName);
        DistinctIterable<Integer> docs = collection.distinct("properties.intersectionId", Integer.class);
        MongoCursor<Integer> results = docs.iterator();
        List<IntersectionReferenceData> referenceDataList = new ArrayList<>();

        while (results.hasNext()) {
            Integer intersectionId = results.next();
                if (intersectionId != null){
                Bson projectionFields = Projections.fields(
                        Projections.include("properties.intersectionId", "properties.originIp",
                                "properties.refPoint.latitude", "properties.refPoint.longitude"),
                        Projections.excludeId());
                Document document = collection.find(eq("properties.intersectionId", intersectionId))
                        .projection(projectionFields).sort(Sorts.descending("properties.timeStamp")).first();
                IntersectionReferenceData data = new IntersectionReferenceData();
                Document properties = document.get("properties", Document.class);

                if (properties != null) {
                    Document refPoint = properties.get("refPoint", Document.class);
                    data.setIntersectionID(intersectionId);
                    data.setRoadRegulatorID("-1");
                    data.setRsuIP(properties.getString("originIp"));
                    if (refPoint != null) {
                        data.setLatitude(refPoint.getDouble("latitude"));
                        data.setLongitude(refPoint.getDouble("longitude"));
                    }
                }
                referenceDataList.add(data);
            }
        }

        return referenceDataList;
    }

    public List<IDCount> getMapBroadcastRates(int intersectionID, Long startTime, Long endTime) {

        String startTimeString = Instant.ofEpochMilli(0).toString();
        String endTimeString = Instant.now().toString();

        if (startTime != null) {
            startTimeString = Instant.ofEpochMilli(startTime).toString();
        }
        if (endTime != null) {
            endTimeString = Instant.ofEpochMilli(endTime).toString();
        }
        AggregationOptions options = AggregationOptions.builder().allowDiskUse(true).build();

        Aggregation aggregation = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("properties.intersectionId").is(intersectionID)),
                Aggregation.match(Criteria.where("properties.timeStamp").gte(startTimeString).lte(endTimeString)),
                Aggregation.project("properties.timeStamp"),
                Aggregation.project()
                        .and(DateOperators.DateFromString.fromStringOf("timeStamp")).as("date"),
                Aggregation.project()
                        .and(DateOperators.DateToString.dateOf("date").toString("%Y-%m-%d-%H")).as("dateStr"),
                Aggregation.group("dateStr").count().as("count"),
                Aggregation.sort(Sort.Direction.ASC, "_id")).withOptions(options);

        AggregationResults<IDCount> result = mongoTemplate.aggregate(aggregation, collectionName, IDCount.class);
        List<IDCount> results = result.getMappedResults();

        for (IDCount r : results) {
            r.setCount((double) r.getCount() / 3600.0);
        }

        return results;
    }

    public List<IDCount> getMapBroadcastRateDistribution(int intersectionID, Long startTime, Long endTime) {

        String startTimeString = Instant.ofEpochMilli(0).toString();
        String endTimeString = Instant.now().toString();

        if (startTime != null) {
            startTimeString = Instant.ofEpochMilli(startTime).toString();
        }
        if (endTime != null) {
            endTimeString = Instant.ofEpochMilli(endTime).toString();
        }

        AggregationOptions options = AggregationOptions.builder().allowDiskUse(true).build();

        Aggregation aggregation = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("properties.intersectionId").is(intersectionID)),
                Aggregation.match(Criteria.where("properties.timeStamp").gte(startTimeString).lte(endTimeString)),
                Aggregation.project("properties.timeStamp"),
                Aggregation.project()
                        .and(DateOperators.DateFromString.fromStringOf("timeStamp")).as("date"),
                Aggregation.project()
                        .and(ConvertOperators.ToLong.toLong("$date")).as("utcmillisecond"),
                Aggregation.project()
                        .and(ArithmeticOperators.Divide.valueOf("utcmillisecond").divideBy(10 * 1000)).as("decisecond"),
                Aggregation.project()
                        .and(ArithmeticOperators.Round.roundValueOf("decisecond")).as("decisecond"),
                Aggregation.group("decisecond").count().as("msgPerDecisecond"),
                Aggregation.bucket("msgPerDecisecond")
                        .withBoundaries(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20)
                        .withDefaultBucket(20)
                        .andOutputCount().as("count"))
                .withOptions(options);

        AggregationResults<IDCount> result = mongoTemplate.aggregate(aggregation, collectionName, IDCount.class);
        List<IDCount> results = result.getMappedResults();

        return results;
    }

    @Override
    public void add(ProcessedMap<LineString> item) {
        mongoTemplate.save(item, collectionName);
    }

}