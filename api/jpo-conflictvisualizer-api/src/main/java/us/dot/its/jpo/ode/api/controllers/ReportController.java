package us.dot.its.jpo.ode.api.controllers;

import java.io.ByteArrayOutputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.fasterxml.jackson.databind.ObjectMapper;

import us.dot.its.jpo.conflictmonitor.monitor.models.assessments.LaneDirectionOfTravelAssessment;
import us.dot.its.jpo.conflictmonitor.monitor.models.events.minimum_data.MapMinimumDataEvent;
import us.dot.its.jpo.conflictmonitor.monitor.models.events.minimum_data.SpatMinimumDataEvent;
import us.dot.its.jpo.ode.api.ConflictMonitorApiProperties;
import us.dot.its.jpo.ode.api.ReportBuilder;
import us.dot.its.jpo.ode.api.accessors.assessments.ConnectionOfTravelAssessment.ConnectionOfTravelAssessmentRepository;
import us.dot.its.jpo.ode.api.accessors.assessments.LaneDirectionOfTravelAssessment.LaneDirectionOfTravelAssessmentRepository;
import us.dot.its.jpo.ode.api.accessors.assessments.SignalStateAssessment.StopLinePassageAssessmentRepository;
import us.dot.its.jpo.ode.api.accessors.assessments.SignalStateEventAssessment.SignalStateEventAssessmentRepository;
import us.dot.its.jpo.ode.api.accessors.events.ConnectionOfTravelEvent.ConnectionOfTravelEventRepository;
import us.dot.its.jpo.ode.api.accessors.events.IntersectionReferenceAlignmentEvent.IntersectionReferenceAlignmentEventRepository;
import us.dot.its.jpo.ode.api.accessors.events.LaneDirectionOfTravelEvent.LaneDirectionOfTravelEventRepository;
import us.dot.its.jpo.ode.api.accessors.events.MapBroadcastRateEvents.MapBroadcastRateEventRepository;
import us.dot.its.jpo.ode.api.accessors.events.MapMinimumDataEvent.MapMinimumDataEventRepository;
import us.dot.its.jpo.ode.api.accessors.events.SignalGroupAlignmentEvent.SignalGroupAlignmentEventRepository;
import us.dot.its.jpo.ode.api.accessors.events.SignalStateConflictEvent.SignalStateConflictEventRepository;
import us.dot.its.jpo.ode.api.accessors.events.SignalStateEvent.SignalStateEventRepository;
import us.dot.its.jpo.ode.api.accessors.events.SignalStateStopEvent.SignalStateStopEventRepository;
import us.dot.its.jpo.ode.api.accessors.events.SpatBroadcastRateEvent.SpatBroadcastRateEventRepository;
import us.dot.its.jpo.ode.api.accessors.events.SpatMinimumDataEvent.SpatMinimumDataEventRepository;
import us.dot.its.jpo.ode.api.accessors.events.TimeChangeDetailsEvent.TimeChangeDetailsEventRepository;
import us.dot.its.jpo.ode.api.accessors.map.ProcessedMapRepository;
import us.dot.its.jpo.ode.api.accessors.spat.ProcessedSpatRepository;
import us.dot.its.jpo.ode.api.models.ChartData;
import us.dot.its.jpo.ode.api.models.DailyData;
import us.dot.its.jpo.ode.api.models.IDCount;
import us.dot.its.jpo.ode.api.models.LaneConnectionCount;

@RestController
public class ReportController {

    private static final Logger logger = LoggerFactory.getLogger(ReportController.class);
    

    ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    ConflictMonitorApiProperties props;

    @Autowired
    ProcessedMapRepository processedMapRepo;

    @Autowired
    ProcessedSpatRepository processedSpatRepo;

    @Autowired
    SignalStateEventRepository signalStateEventRepo;

    @Autowired
    SignalStateStopEventRepository signalStateStopEventRepo;

    @Autowired
    ConnectionOfTravelEventRepository connectionOfTravelEventRepo;

    @Autowired
    IntersectionReferenceAlignmentEventRepository intersectionReferenceAlignmentEventRepo;

    @Autowired
    LaneDirectionOfTravelEventRepository laneDirectionOfTravelEventRepo;

    @Autowired
    SignalGroupAlignmentEventRepository signalGroupAlignmentEventRepo;

    @Autowired
    SignalStateConflictEventRepository signalStateConflictEventRepo;

    @Autowired
    TimeChangeDetailsEventRepository timeChangeDetailsEventRepo;

    @Autowired
    LaneDirectionOfTravelAssessmentRepository laneDirectionOfTravelAssessmentRepo;

    @Autowired
    ConnectionOfTravelAssessmentRepository connectionOfTravelAssessmentRepo;

    @Autowired
    StopLinePassageAssessmentRepository signalStateAssessmentRepo;

    @Autowired
    SignalStateEventAssessmentRepository signalStateEventAssessmentRepo;

    @Autowired
    SpatMinimumDataEventRepository spatMinimumDataEventRepo;

    @Autowired
    MapMinimumDataEventRepository mapMinimumDataEventRepo;

    @Autowired
    SpatBroadcastRateEventRepository spatBroadcastRateEventRepo;

    @Autowired
    MapBroadcastRateEventRepository mapBroadcastRateEventRepo;



    public String getCurrentTime() {
        return ZonedDateTime.now().toInstant().toEpochMilli() + "";
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @RequestMapping(value = "/reports/generate", method = RequestMethod.GET, produces = "application/octet-stream")
    @PreAuthorize("hasRole('USER') || hasRole('ADMIN')")
    public byte[] generateReport(
            @RequestParam(name = "intersection_id", required = true) int intersectionID,
            @RequestParam(name = "start_time_utc_millis", required = true) long startTime,
            @RequestParam(name = "end_time_utc_millis", required = true) long endTime) {
                logger.info("Generating Report");

                // Lane Direction of Travel Info
                List<IDCount> laneDirectionOfTravelEventCounts = laneDirectionOfTravelEventRepo.getLaneDirectionOfTravelEventsByDay(intersectionID, startTime, endTime);
                List<IDCount> laneDirectionOfTravelMedianDistanceDistribution = laneDirectionOfTravelEventRepo.getMedianDistanceByFoot(intersectionID, startTime, endTime);
                List<IDCount> laneDirectionOfTravelMedianHeadingDistribution = laneDirectionOfTravelEventRepo.getMedianDistanceByDegree(intersectionID, startTime, endTime);
                List<LaneDirectionOfTravelAssessment> laneDirectionOfTravelAssessmentCount = laneDirectionOfTravelAssessmentRepo.getLaneDirectionOfTravelOverTime(intersectionID, startTime, endTime);
        
                // Connection of Travel Info
                List<IDCount> connectionOfTravelEventCounts = connectionOfTravelEventRepo.getConnectionOfTravelEventsByDay(intersectionID, startTime, endTime);
                List<LaneConnectionCount> laneConnectionCounts = connectionOfTravelEventRepo.getConnectionOfTravelEventsByConnection(intersectionID, startTime, endTime);
        
                // Signal State Event Counts
                List<IDCount> signalstateEventCounts = signalStateEventRepo.getSignalStateEventsByDay(intersectionID, startTime, endTime);
        
                // Signal state Stop Events
                List<IDCount> signalStateStopEventCounts = signalStateStopEventRepo.getSignalStateStopEventsByDay(intersectionID, startTime, endTime);
        
                // Signal state Conflict Events
                List<IDCount> signalStateConflictEventCounts = signalStateConflictEventRepo.getSignalStateConflictEventsByDay(intersectionID, startTime, endTime);
                
                // Time Change Details Events
                List<IDCount> timeChangeDetailsEventCounts = timeChangeDetailsEventRepo.getTimeChangeDetailsEventsByDay(intersectionID, startTime, endTime);
        
                // Intersection Reference Alignment Event Counts
                List<IDCount> intersectionReferenceAlignmentEventCounts = intersectionReferenceAlignmentEventRepo.getIntersectionReferenceAlignmentEventsByDay(intersectionID, startTime, endTime);



                // Map / Spat counts
                // List<IDCount> mapCounts = processedMapRepo.getMapBroadcastRates(intersectionID, startTime, endTime);
                // List<IDCount> spatCounts = processedSpatRepo.getSpatBroadcastRates(intersectionID, startTime, endTime);

                List<IDCount> mapMinimumDataEventCount = mapMinimumDataEventRepo.getMapMinimumDataEventsByDay(intersectionID, startTime, endTime);
                List<IDCount> spatMinimumDataEventCount = spatMinimumDataEventRepo.getSpatMinimumDataEventsByDay(intersectionID, startTime, endTime);

                List<IDCount> mapBroadcastRateEventCount = mapBroadcastRateEventRepo.getMapBroadcastRateEventsByDay(intersectionID, startTime, endTime);
                List<IDCount> spatBroadcastRateEventCount = spatBroadcastRateEventRepo.getSpatBroadcastRateEventsByDay(intersectionID, startTime, endTime);

                List<SpatMinimumDataEvent> latestSpatMinimumdataEvent = spatMinimumDataEventRepo.find(spatMinimumDataEventRepo.getQuery(intersectionID, startTime, endTime, true));
                List<MapMinimumDataEvent> latestMapMinimumdataEvent = mapMinimumDataEventRepo.find(mapMinimumDataEventRepo.getQuery(intersectionID, startTime, endTime, true));



                

                // Map / Spat Message Rate Distributions
                // List<IDCount> spatCountDistribution = processedSpatRepo.getSpatBroadcastRateDistribution(intersectionID, startTime, endTime);
                // List<IDCount> mapCountDistribution = processedMapRepo.getMapBroadcastRateDistribution(intersectionID, startTime, endTime);
                
                ByteArrayOutputStream stream = new ByteArrayOutputStream();

                ReportBuilder builder = new ReportBuilder(stream);
                List<String> dateStrings = builder.getDayStringsInRange(startTime, endTime);
                builder.addTitlePage("Conflict Monitor Report", startTime, endTime);

                // Add Lane Direction of Travel Information
                builder.addTitle("Lane Direction of Travel");
                builder.addLaneDirectionOfTravelEvent(DailyData.fromIDCountDays(laneDirectionOfTravelEventCounts, dateStrings));
                builder.addLaneDirectionOfTravelMedianDistanceDistribution(ChartData.fromIDCountList(laneDirectionOfTravelMedianDistanceDistribution));
                builder.addLaneDirectionOfTravelMedianHeadingDistribution(ChartData.fromIDCountList(laneDirectionOfTravelMedianHeadingDistribution));
                builder.addDistanceFromCenterlineOverTime(laneDirectionOfTravelAssessmentCount);
                builder.addHeadingOverTime(laneDirectionOfTravelAssessmentCount);
                builder.addPageBreak();

                // Add Lane Connection of Travel Information
                builder.addTitle("Connection of Travel");
                builder.addConnectionOfTravelEvent(DailyData.fromIDCountDays(connectionOfTravelEventCounts, dateStrings));
                builder.addLaneConnectionOfTravelMap(laneConnectionCounts);
                builder.addPageBreak();

                // Add Signal State Events
                builder.addTitle("Signal State Events");
                builder.addSignalStateEvents(DailyData.fromIDCountDays(signalstateEventCounts, dateStrings));
                builder.addSignalStateStopEvents(DailyData.fromIDCountDays(signalStateStopEventCounts, dateStrings));
                builder.addSignalStateConflictEvent(DailyData.fromIDCountDays(signalStateConflictEventCounts, dateStrings));

                // Add Time Change Details
                builder.addSpatTimeChangeDetailsEvent(DailyData.fromIDCountDays(timeChangeDetailsEventCounts, dateStrings));
                builder.addPageBreak();

                // Add Intersection Reference Alignment Event Counts
                builder.addTitle("Intersection Reference Alignment Event Counts");
                builder.addIntersectionReferenceAlignmentEvents(DailyData.fromIDCountDays(intersectionReferenceAlignmentEventCounts, dateStrings));
                builder.addPageBreak();

                // Add Map Broadcast Rate Events
                builder.addTitle("MAP");
                builder.addMapBroadcastRateEvents(DailyData.fromIDCountDays(mapBroadcastRateEventCount, dateStrings));
                builder.addMapMinimumDataEvents(DailyData.fromIDCountDays(mapMinimumDataEventCount, dateStrings));
                builder.addPageBreak();
                builder.addMapMinimumDataEventErrors(latestMapMinimumdataEvent);
                builder.addPageBreak();

                // Add Map Broadcast Rate Events
                builder.addTitle("SPaT");
                builder.addSpatBroadcastRateEvents(DailyData.fromIDCountDays(spatBroadcastRateEventCount, dateStrings));
                builder.addSpatMinimumDataEvents(DailyData.fromIDCountDays(spatMinimumDataEventCount, dateStrings));
                builder.addPageBreak();
                builder.addSpatMinimumDataEventErrors(latestSpatMinimumdataEvent);
                builder.addPageBreak();



                
                // builder.addTitle("Map");
                // builder.addMapBroadcastRate(mapCounts);
                // builder.addMapBroadcastRateDistribution(mapCountDistribution, startTime, endTime);
                
                // builder.addPageBreak();

                // builder.addTitle("SPaT");
                // builder.addSpatBroadcastRate(spatCounts);
                // builder.addSpatBroadcastRateDistribution(spatCountDistribution, startTime, endTime);
                
                // builder.addPageBreak();
                
                
            

                builder.write();
                

                return stream.toByteArray();
    }

    // @Bean
    // public void test(){
    //     System.out.println("Generating Test PDF");

    //     int intersectionID = 6311;
    //     long startTime = 0;
    //     // long startTime = 1678233600000L;
    //     long endTime = Instant.now().toEpochMilli();

        

    //     // List<IDCount> laneDirectionOfTravelEventCounts = laneDirectionOfTravelEventRepo.getLaneDirectionOfTravelEventsByDay(intersectionID, startTime, endTime);
    //     // List<IDCount> laneDirectionOfTravelMedianDistanceDistribution = laneDirectionOfTravelEventRepo.getMedianDistanceByFoot(intersectionID, startTime, endTime);
    //     // List<IDCount> laneDirectionOfTravelMedianHeadingDistribution = laneDirectionOfTravelEventRepo.getMedianDistanceByDegree(intersectionID, startTime, endTime);
    //     // List<LaneDirectionOfTravelAssessment> laneDirectionOfTravelAssessmentCount = laneDirectionOfTravelAssessmentRepo.getLaneDirectionOfTravelOverTime(intersectionID, startTime, endTime);


    //     // List<IDCount> connectionOfTravelEventCounts = connectionOfTravelEventRepo.getConnectionOfTravelEventsByDay(intersectionID, startTime, endTime);
    //     // List<LaneConnectionCount> laneConnectionCounts = connectionOfTravelEventRepo.getConnectionOfTravelEventsByConnection(intersectionID, startTime, endTime);

    //     // List<IDCount> signalstateEventCounts = signalStateEventRepo.getSignalStateEventsByDay(intersectionID, startTime, endTime);

    //     // List<IDCount> signalStateStopEventCounts = signalStateStopEventRepo.getSignalStateStopEventsByDay(intersectionID, startTime, endTime);

    //     // List<IDCount> signalStateConflictEventCounts = signalStateConflictEventRepo.getSignalStateConflictEventsByDay(intersectionID, startTime, endTime);
        
    //     // List<IDCount> timeChangeDetailsEventCounts= timeChangeDetailsEventRepo.getTimeChangeDetailsEventsByDay(intersectionID, startTime, endTime);

    //     // List<IDCount> mapCounts = processedMapRepo.getMapBroadcastRates(intersectionID, startTime, endTime);
    //     // List<IDCount> spatCounts = processedSpatRepo.getSpatBroadcastRates(intersectionID, startTime, endTime);

    //     // List<IDCount> spatCountDistribution = processedSpatRepo.getSpatBroadcastRateDistribution(intersectionID, startTime, endTime);
    //     // List<IDCount> mapCountDistribution = processedMapRepo.getMapBroadcastRateDistribution(intersectionID, startTime, endTime);
 
        

    //     try {
            
    //         ReportBuilder builder = new ReportBuilder(new FileOutputStream("test.pdf"));
    //         List<String> dateStrings = builder.getDayStringsInRange(startTime, endTime);
    //         builder.addTitlePage("Conflict Monitor Report", startTime, endTime);

    //         // // Add Lane Direction of Travel Information
    //         // builder.addTitle("Lane Direction of Travel");
    //         // builder.addLaneDirectionOfTravelEvent(DailyData.fromIDCountDays(laneDirectionOfTravelEventCounts, dateStrings));
    //         // builder.addLaneDirectionOfTravelMedianDistanceDistribution(ChartData.fromIDCountList(laneDirectionOfTravelMedianDistanceDistribution));
    //         // builder.addLaneDirectionOfTravelMedianHeadingDistribution(ChartData.fromIDCountList(laneDirectionOfTravelMedianHeadingDistribution));
    //         // builder.addDistanceFromCenterlineOverTime(laneDirectionOfTravelAssessmentCount);
    //         // builder.addHeadingOverTime(laneDirectionOfTravelAssessmentCount);
    //         // builder.addPageBreak();

    //         // // Add Lane Connection of Travel Information
    //         // builder.addTitle("Connection of Travel");
    //         // builder.addConnectionOfTravelEvent(DailyData.fromIDCountDays(connectionOfTravelEventCounts, dateStrings));
    //         // builder.addLaneConnectionOfTravelMap(laneConnectionCounts);
    //         // builder.addPageBreak();

    //         // // Add Signal State Events
    //         // builder.addTitle("Signal State Events");
    //         // builder.addSignalStateEvents(DailyData.fromIDCountDays(signalstateEventCounts, dateStrings));
    //         // builder.addSignalStateStopEvents(DailyData.fromIDCountDays(signalStateStopEventCounts, dateStrings));
    //         // builder.addSignalStateConflictEvent(DailyData.fromIDCountDays(signalStateConflictEventCounts, dateStrings));
    //         // builder.addPageBreak();

    //         // // Add Time Change Details
    //         // builder.addSpatTimeChangeDetailsEvent(DailyData.fromIDCountDays(timeChangeDetailsEventCounts, dateStrings));
    //         // builder.addPageBreak();


    //         // builder.addTitle("Map");
    //         // builder.addMapBroadcastRate(mapCounts);
    //         // builder.addMapBroadcastRateDistribution(mapCountDistribution, startTime, endTime);
    //         // builder.addPageBreak();

    //         // builder.addTitle("SPaT");
    //         // builder.addSpatBroadcastRate(spatCounts);
    //         // builder.addSpatBroadcastRateDistribution(spatCountDistribution, startTime, endTime);
    //         // builder.addPageBreak();
            
    //         // List<Long> secondStrings = builder.getSecondsStringInRange(startTime, endTime);
            
    //         // builder.addSpatMinimumDataEventErrors(latestSpatMinimumdataEvent);
    //         // builder.addMapMinimumDataEventErrors(latestMapMinimumdataEvent);

    //         builder.write();
            

    //     } catch (FileNotFoundException e) {
    //         // TODO Auto-generated catch block
    //         e.printStackTrace();
    //     }
    //     System.out.println("Test PDF Generation Complete");
        
        
    // }
}