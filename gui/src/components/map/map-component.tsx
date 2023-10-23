import React, { useState, useEffect } from "react";
import Map, { Source, Layer, Popup } from "react-map-gl";

import { Container, Col } from "reactstrap";

import { Paper, Box, Typography } from "@mui/material";

// import mapMessageData from "./processed_map_v4.json";
import type { CircleLayer, LayerProps, LineLayer } from "react-map-gl";
import ControlPanel from "./control-panel";
import MessageMonitorApi from "../../apis/mm-api";
import EventsApi from "../../apis/events-api";
import NotificationApi from "../../apis/notification-api";
import { useDashboardContext } from "../../contexts/dashboard-context";
import { Marker } from "mapbox-gl";
import { SidePanel } from "./side-panel";
import { CustomPopup } from "./popup";
import { useSession } from "next-auth/react";
import getConfig from "next/config";
import { generateColorDictionary, generateMapboxStyleExpression } from "./utilities/colors";
import { MapLegend } from "./map-legend";
const { publicRuntimeConfig } = getConfig();

const allInteractiveLayerIds = [
  "mapMessage",
  "connectingLanes",
  "connectingLanesYellow",
  "connectingLanesInactive",
  "connectingLanesMissing",
  "signalStatesGreen",
  "signalStatesYellow",
  "signalStatesRed",
  "bsm",
  "invalidLaneCollection",
];

const mapMessageLayer: LineLayer = {
  id: "mapMessage",
  type: "line",
  paint: {
    "line-width": 5,
    "line-color": ["case", ["==", ["get", "ingressPath"], true], "#eb34e8", "#0004ff"],
  },
};

const mapMessageHighlightLayer: LineLayer = {
  id: "mapMessageHighlight",
  type: "line",
  paint: {
    "line-width": 5,
    "line-color": "#fffc50",
  },
};

const preMovementBaseLayer: LineLayer = {
  id: "connectingLanes",
  type: "line",
  paint: {
    "line-width": 5,
    "line-color": "#e6b000",
  },
};

const connectingLanesPreMovementLayer: LineLayer = {
  id: "connectingLanesPreMovement",
  type: "line",
  paint: {
    "line-width": 5,
    "line-color": "#e6b000",
  },
};

const connectingLanesLayer: LineLayer = {
  id: "connectingLanes",
  type: "line",
  paint: {
    "line-width": [
      "match",
      ["get", "signalState"],
      "UNAVAILABLE",
      3,
      "DARK",
      3,
      "STOP_THEN_PROCEED",
      3,
      "STOP_AND_REMAIN",
      3,
      "PRE_MOVEMENT",
      5,
      "PERMISSIVE_MOVEMENT_ALLOWED",
      5,
      "PROTECTED_MOVEMENT_ALLOWED",
      5,
      "PERMISSIVE_CLEARANCE",
      5,
      "PROTECTED_CLEARANCE",
      5,
      "CAUTION_CONFLICTING_TRAFFIC",
      5,
      5,
    ],
    "line-color": [
      "match",
      ["get", "signalState"],
      "UNAVAILABLE",
      "#797979",
      "DARK",
      "#3a3a3a",
      "STOP_THEN_PROCEED",
      "#c00000",
      "STOP_AND_REMAIN",
      "#c00000",
      "PRE_MOVEMENT",
      "#c00000",
      "PERMISSIVE_MOVEMENT_ALLOWED",
      "#267700",
      "PROTECTED_MOVEMENT_ALLOWED",
      "#267700",
      "PERMISSIVE_CLEARANCE",
      "#e6b000",
      "PROTECTED_CLEARANCE",
      "#e6b000",
      "CAUTION_CONFLICTING_TRAFFIC",
      "#e6b000",
      "#797979",
    ],
    "line-dasharray": [
      "match",
      ["get", "signalState"],
      "UNAVAILABLE",
      ["literal", [2, 1]],
      "DARK",
      ["literal", [2, 1]],
      "STOP_THEN_PROCEED",
      ["literal", [2, 1]],
      "STOP_AND_REMAIN",
      ["literal", [1]],
      "PRE_MOVEMENT",
      ["literal", [2, 2]],
      "PERMISSIVE_MOVEMENT_ALLOWED",
      ["literal", [2, 1]],
      "PROTECTED_MOVEMENT_ALLOWED",
      ["literal", [1]],
      "PERMISSIVE_CLEARANCE",
      ["literal", [2, 1]],
      "PROTECTED_CLEARANCE",
      ["literal", [1]],
      "CAUTION_CONFLICTING_TRAFFIC",
      ["literal", [1, 4]],
      ["literal", [2, 1]],
    ],
  },
};

const RED_LIGHT = "RED_LIGHT";
const YELLOW_LIGHT = "YELLOW_LIGHT";
const GREEN_LIGHT = "GREEN_LIGHT";
const YELLOW_RED_LIGHT = "YELLOW_RED_LIGHT";
const RED_FLASHING_LIGHT = "RED_FLASHING_LIGHT";
const UNKNOWN_LIGHT = "UNKNOWN_LIGHT";

const signalStateLayerGreen: LayerProps = {
  id: "signalStatesGreen",
  type: "symbol",
  layout: {
    "icon-image": "traffic-light-icon-green-1",
    "icon-allow-overlap": true,
    "icon-size": ["interpolate", ["linear"], ["zoom"], 0, 0, 6, 0.5, 9, 0.4, 22, 0.08],
  },
};

const signalStateLayerYellowRed: LayerProps = {
  id: "signalStateYellowRed",
  type: "symbol",
  layout: {
    "icon-image": "traffic-light-icon-yellow-red-1",
    "icon-allow-overlap": true,
    "icon-size": ["interpolate", ["linear"], ["zoom"], 0, 0, 6, 0.5, 9, 0.4, 22, 0.08],
  },
};

const signalStateLayerRedFlashing: LayerProps = {
  id: "signalStateRedFlashing",
  type: "symbol",
  layout: {
    "icon-image": "traffic-light-icon-red-flashing",
    "icon-allow-overlap": true,
    "icon-size": ["interpolate", ["linear"], ["zoom"], 0, 0, 6, 0.5, 9, 0.4, 22, 0.08],
  },
};

const signalStateLayerRed: LayerProps = {
  id: "signalStatesRed",
  type: "symbol",
  layout: {
    "icon-image": "traffic-light-icon-red-1",
    "icon-allow-overlap": true,
    "icon-size": ["interpolate", ["linear"], ["zoom"], 0, 0, 6, 0.5, 9, 0.4, 22, 0.08],
  },
};

const signalStateLayerYellow: LayerProps = {
  id: "signalStatesYellow",
  type: "symbol",
  layout: {
    "icon-image": "traffic-light-icon-yellow-1",
    "icon-allow-overlap": true,
    "icon-size": ["interpolate", ["linear"], ["zoom"], 0, 0, 6, 0.5, 9, 0.4, 22, 0.08],
  },
};

const signalStateLayerUnknown: LayerProps = {
  id: "signalStatesUnknown",
  type: "symbol",
  layout: {
    "icon-image": "traffic-light-icon-unknown",
    "icon-allow-overlap": true,
    "icon-size": ["interpolate", ["linear"], ["zoom"], 0, 0, 6, 0.5, 9, 0.4, 22, 0.08],
  },
};

const bsmHighlightLayer: LayerProps = {
  id: "bsmHighlight",
  type: "circle",
  paint: {
    "circle-color": "#0000FF",
    "circle-radius": 8,
  },
};

const markerLayer: LayerProps = {
  id: "invalidLaneCollection",
  type: "line",
  paint: {
    "line-width": 20,
    "line-color": "#d40000",
    // "line-dasharray": [2, 1],
  },
};

const markerHighlightLayer: LayerProps = {
  id: "invalidLaneCollectionHighlight",
  type: "line",
  paint: {
    "line-width": 20,
    "line-color": "#fffc50",
    // "line-dasharray": [2, 1],
  },
};

const pulsingDotLayer: LayerProps = {
  id: "layer-with-pulsing-dot",
  type: "symbol",
  source: "dot-point",
  layout: {
    "icon-image": "pulsing-dot",
  },
};

const generateQueryParams = (
  source: MessageMonitor.Notification | MessageMonitor.Event | Assessment | timestamp | undefined,
  sourceDataType: "notification" | "event" | "assessment" | "timestamp" | undefined
) => {
  const startOffset = 1000 * 60 * 1;
  const endOffset = 1000 * 60 * 1;

  switch (sourceDataType) {
    case "notification":
      const notification = source as MessageMonitor.Notification;
      return {
        startDate: new Date(notification.notificationGeneratedAt - startOffset),
        endDate: new Date(notification.notificationGeneratedAt + endOffset),
        eventDate: new Date(notification.notificationGeneratedAt),
        vehicleId: undefined,
      };
    case "event":
      const event = source as MessageMonitor.Event;
      return {
        startDate: new Date(event.eventGeneratedAt - startOffset),
        endDate: new Date(event.eventGeneratedAt + endOffset),
        eventDate: new Date(event.eventGeneratedAt),
        vehicleId: undefined,
      };
    case "assessment":
      const assessment = source as Assessment;
      return {
        startDate: new Date(assessment.assessmentGeneratedAt - startOffset),
        endDate: new Date(assessment.assessmentGeneratedAt + endOffset),
        eventDate: new Date(assessment.assessmentGeneratedAt),
        vehicleId: undefined,
      };
    case "timestamp":
      const ts = (source as timestamp).timestamp;
      return {
        startDate: new Date(ts - startOffset),
        endDate: new Date(ts + endOffset),
        eventDate: new Date(ts),
        vehicleId: undefined,
      };
    default:
      return {
        startDate: new Date(Date.now() - startOffset),
        endDate: new Date(Date.now() + endOffset),
        eventDate: new Date(Date.now()),
        vehicleId: undefined,
      };
  }
};

type timestamp = {
  timestamp: number;
};

type MyProps = {
  sourceData: MessageMonitor.Notification | MessageMonitor.Event | Assessment | timestamp | undefined;
  sourceDataType: "notification" | "event" | "assessment" | "timestamp" | undefined;
  intersectionId: number | undefined;
};

const MapTab = (props: MyProps) => {
  const MAPBOX_API_TOKEN = publicRuntimeConfig.MAPBOX_TOKEN!;

  const [queryParams, setQueryParams] = useState<{
    startDate: Date;
    endDate: Date;
    eventDate: Date;
    vehicleId?: string;
  }>({
    startDate: new Date(Date.now() - 1000 * 60),
    endDate: new Date(Date.now() + 1000 * 60),
    eventDate: new Date(Date.now()),
    vehicleId: undefined,
  });

  const [mapLegendColors, setMapLegendColors] = useState<{
    bsmColors: { [key: string]: string };
    laneColors: { [key: string]: string };
    travelConnectionColors: { [key: string]: string };
  }>({
    bsmColors: { Other: "#0004ff" },
    laneColors: {
      Ingress: "#0004ff",
      Egress: "#eb34e8",
    },
    travelConnectionColors: {
      Green: "#30af25",
      Yellow: "#c5b800",
      Red: "#da2f2f",
      "No SPAT/Unknown": "#000000",
    },
  });

  const [bsmLayerStyle, setBsmLayerStyle] = useState<CircleLayer>({
    id: "bsm",
    type: "circle",
    paint: {
      "circle-color": ["match", ["get", "id"], "temp-id", "#0004ff", "#0004ff"],
      "circle-radius": 8,
    },
  });

  const [mapData, setMapData] = useState<ProcessedMap>();
  const [mapSignalGroups, setMapSignalGroups] = useState<SignalStateFeatureCollection>();
  const [signalStateData, setSignalStateData] = useState<SignalStateFeatureCollection[]>();
  const [spatSignalGroups, setSpatSignalGroups] = useState<SpatSignalGroups>();
  const [currentSignalGroups, setCurrentSignalGroups] = useState<SpatSignalGroup[]>();
  const [currentBsms, setCurrentBsms] = useState<BsmFeatureCollection>({
    type: "FeatureCollection" as "FeatureCollection",
    features: [],
  });
  const [connectingLanes, setConnectingLanes] = useState<ConnectingLanesFeatureCollection>();
  const [bsmData, setBsmData] = useState<BsmFeatureCollection>({
    type: "FeatureCollection" as "FeatureCollection",
    features: [],
  });
  const [surroundingEvents, setSurroundingEvents] = useState<MessageMonitor.Event[]>([]);
  const [filteredSurroundingEvents, setFilteredSurroundingEvents] = useState<MessageMonitor.Event[]>([]);
  const [surroundingNotifications, setSurroundingNotifications] = useState<MessageMonitor.Notification[]>([]);
  const [filteredSurroundingNotifications, setFilteredSurroundingNotifications] = useState<
    MessageMonitor.Notification[]
  >([]);
  //   const mapRef = useRef<mapboxgl.Map>();
  const [viewState, setViewState] = useState({
    latitude: 39.587905,
    longitude: -105.0907089,
    zoom: 19,
  });
  const [timeWindowSeconds, setTimeWindowSeconds] = useState<number>(60);
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [renderTimeInterval, setRenderTimeInterval] = useState<number[]>([0, 0]);
  const mapRef = React.useRef<any>(null);
  //   const { intersectionId: dbIntersectionId } = useDashboardContext();
  const [selectedFeature, setSelectedFeature] = useState<any>(undefined);
  const [rawData, setRawData] = useState({});
  const [mapSpatTimes, setMapSpatTimes] = useState({ mapTime: 0, spatTime: 0 });
  const { data: session } = useSession();

  //   const size = 200;
  //   const context: CanvasRenderingContext2D | null = null;

  //   const pulsingDot: {
  //     width: number;
  //     height: number;
  //     data: Uint8Array | Uint8ClampedArray;
  //     context: CanvasRenderingContext2D | null;
  //     onAdd: () => void;
  //     render: () => boolean;
  //   } = {
  //     width: size,
  //     height: size,
  //     data: new Uint8Array(size * size * 4),
  //     context: context,

  //     // When the layer is added to the map,
  //     // get the rendering context for the map canvas.
  //     onAdd: function () {
  //       const canvas = document.createElement("canvas");
  //       canvas.width = this.width;
  //       canvas.height = this.height;
  //       this.context = canvas.getContext("2d");
  //     },

  //     // Call once before every frame where the icon will be used.
  //     render: function () {
  //       const duration = 1000;
  //       const t = (performance.now() % duration) / duration;

  //       const radius = (size / 2) * 0.3;
  //       const outerRadius = (size / 2) * 0.7 * t + radius;
  //       const context = this.context;
  //       if (context != null) {
  //         // Draw the outer circle.
  //         context.clearRect(0, 0, this.width, this.height);
  //         context.beginPath();
  //         context.arc(this.width / 2, this.height / 2, outerRadius, 0, Math.PI * 2);
  //         context.fillStyle = `rgba(255, 200, 200, ${1 - t})`;
  //         context.fill();

  //         // Draw the inner circle.
  //         context.beginPath();
  //         context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
  //         context.fillStyle = "rgba(255, 100, 100, 1)";
  //         context.strokeStyle = "white";
  //         context.lineWidth = 2 + 4 * (1 - t);
  //         context.fill();
  //         context.stroke();

  //         // Update this image's data with data from the canvas.
  //         this.data = context.getImageData(0, 0, this.width, this.height).data;

  //         // Continuously repaint the map, resulting
  //         // in the smooth animation of the dot.
  //         mapRef.current.triggerRepaint();
  //       }

  //       // Return `true` to let the map know that the image was updated.
  //       return true;
  //     },
  //   };

  useEffect(() => {
    console.debug("SELECTED FEATURE", selectedFeature);
  }, [selectedFeature]);

  const parseMapSignalGroups = (mapMessage: ProcessedMap): SignalStateFeatureCollection => {
    const features: SignalStateFeature[] = [];

    mapMessage?.mapFeatureCollection?.features?.forEach((mapFeature: MapFeature) => {
      if (!mapFeature.properties.ingressApproach || !mapFeature?.properties?.connectsTo?.[0]?.signalGroup) {
        return;
      }
      features.push({
        type: "Feature",
        properties: {
          signalGroup: mapFeature.properties.connectsTo[0].signalGroup,
          intersectionId: mapMessage.properties.intersectionId,
          color: "#FFFFFF",
        },
        geometry: {
          type: "Point",
          coordinates: mapFeature.geometry.coordinates[0],
        },
      });
    });

    return {
      type: "FeatureCollection" as "FeatureCollection",
      features: features,
    };
  };

  const createMarkerForNotification = (
    center: number[],
    notification: MessageMonitor.Notification,
    connectingLanes: MapFeatureCollection
  ) => {
    const features: any[] = [];
    const markerCollection = {
      type: "FeatureCollection" as "FeatureCollection",
      features: features,
    };
    switch (notification.notificationType) {
      case "ConnectionOfTravelNotification":
        const connTravelNotification = notification as ConnectionOfTravelNotification;
        const connTravelAssessmentGroups = connTravelNotification.assessment.connectionOfTravelAssessmentGroups;
        connTravelAssessmentGroups?.forEach((assessmentGroup) => {
          const ingressLocation: number[] | undefined = connectingLanes.features.find(
            (connectingLaneFeature: MapFeature) => {
              return connectingLaneFeature.properties.laneId === assessmentGroup.ingressLaneID;
            }
          )?.geometry.coordinates[0];
          const egressLocation: number[] | undefined = connectingLanes.features.find(
            (connectingLaneFeature: MapFeature) => {
              return connectingLaneFeature.properties.laneId === assessmentGroup.egressLaneID;
            }
          )?.geometry.coordinates[0];
          if (!ingressLocation || !egressLocation) return;
          const marker = {
            type: "Feature",
            properties: {
              description: `${connTravelNotification.notificationText}, egress lane ${assessmentGroup.egressLaneID}, incress lane ${assessmentGroup.ingressLaneID}, connection ID ${assessmentGroup.connectionID}, event count ${assessmentGroup.eventCount}`,
              title: connTravelNotification.notificationType,
            },
            geometry: {
              type: "LineString",
              coordinates: [ingressLocation, egressLocation],
            },
          };
          markerCollection.features.push(marker);
        });
        break;
      case "IntersectionReferenceAlignmentNotification":
        // No markers for this notification
        break;
      case "LaneDirectionOfTravelNotification":
        const laneDirTravelNotification = notification as LaneDirectionOfTravelNotification;
        const laneDirTravelAssessmentGroups = laneDirTravelNotification.assessment.laneDirectionOfTravelAssessmentGroup;
        laneDirTravelAssessmentGroups?.forEach((assessmentGroup) => {
          const laneLocation: number[] | undefined = connectingLanes.features.find(
            (connectingLaneFeature: MapFeature) => {
              return connectingLaneFeature.properties.laneId === assessmentGroup.laneID;
            }
          )?.geometry.coordinates[0];
          if (!laneLocation) return;
          const numEvents = assessmentGroup.inToleranceEvents + assessmentGroup.outOfToleranceEvents;
          const eventsRatio = assessmentGroup.inToleranceEvents / numEvents;
          const marker = {
            type: "Feature",
            properties: {
              description: `${laneDirTravelNotification.notificationText}, lane ID ${assessmentGroup.laneID}, in tolerance events ${eventsRatio} (${assessmentGroup.inToleranceEvents}/${numEvents})`,
              title: laneDirTravelNotification.notificationType,
            },
            geometry: {
              type: "Point",
              coordinates: laneLocation,
            },
          };
          markerCollection.features.push(marker);
        });
        break;
      case "SignalGroupAlignmentNotification":
        // No markers for this notification
        break;
      case "SignalStateConflictNotification":
        const sigStateConflictNotification = notification as SignalStateConflictNotification;
        const sigStateConflictEvent = sigStateConflictNotification.event;
        const sigStateConflictMarker = {
          type: "Feature",
          properties: {
            description: `${sigStateConflictNotification.notificationText}, Conflict type ${sigStateConflictEvent.conflictType}, First conflicting signal state ${sigStateConflictEvent.firstConflictingSignalState} of group ${sigStateConflictEvent.firstConflictingSignalGroup}, Second conflicting signal state ${sigStateConflictEvent.secondConflictingSignalState} of group ${sigStateConflictEvent.secondConflictingSignalGroup}`,
            title: sigStateConflictNotification.notificationType,
          },
          geometry: {
            type: "Point",
            coordinates: center,
          },
        };
        markerCollection.features.push(sigStateConflictMarker);
        break;
      case "TimeChangeDetailsNotification":
        // No markers for this notification
        break;
      case "KafkaStreamsAnomalyNotification":
        // No markers for this notification
        break;
      case "BroadcastRateNotification":
        // No markers for this notification
        break;
    }
    return markerCollection;
  };

  const parseSignalStateToColor = (state?: SignalState): string => {
    switch (state) {
      case "STOP_AND_REMAIN":
        return RED_LIGHT; // red
      case "PRE_MOVEMENT":
        return YELLOW_RED_LIGHT; // red
      case "STOP_THEN_PROCEED":
        return RED_FLASHING_LIGHT; // red
      case "PROTECTED_CLEARANCE":
      case "PERMISSIVE_MOVEMENT_ALLOWED":
      case "PERMISSIVE_CLEARANCE":
      case "CAUTION_CONFLICTING_TRAFFIC":
        return YELLOW_LIGHT; // yellow
      case "PROTECTED_MOVEMENT_ALLOWED":
        return GREEN_LIGHT; // green
      default:
        return UNKNOWN_LIGHT;
    }
  };

  const parseSpatSignalGroups = (spats: ProcessedSpat[]): SpatSignalGroups => {
    const timedSignalGroups: SpatSignalGroups = {};
    spats?.forEach((spat: ProcessedSpat) => {
      timedSignalGroups[Date.parse(spat.odeReceivedAt)] = spat.states.map((state) => {
        return {
          signalGroup: state.signalGroup,
          state: state.stateTimeSpeed?.[0]?.eventState as SignalState,
        };
      });
    });
    return timedSignalGroups;
  };

  const parseBsmToGeojson = (bsmData: OdeBsmData[]): BsmFeatureCollection => {
    return {
      type: "FeatureCollection" as "FeatureCollection",
      features: bsmData.map((bsm) => {
        return {
          type: "Feature",
          properties: {
            ...bsm.payload.data.coreData,
            odeReceivedAt: new Date(bsm.metadata.odeReceivedAt as string).getTime() / 1000,
          },
          geometry: {
            type: "Point",
            coordinates: [bsm.payload.data.coreData.position.longitude, bsm.payload.data.coreData.position.latitude],
          },
        };
      }),
    };
  };

  const addConnections = (
    connectingLanes: ConnectingLanesFeatureCollection,
    signalGroups: SpatSignalGroup[]
  ): ConnectingLanesFeatureCollectionWithSignalState => {
    return {
      ...connectingLanes,
      features: connectingLanes.features.map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          signalState: signalGroups.find((signalGroup) => signalGroup.signalGroup == feature.properties.signalGroupId)
            ?.state,
        },
      })),
    };
  };

  const generateSignalStateFeatureCollection = (
    prevSignalStates: SignalStateFeatureCollection,
    signalGroups: SpatSignalGroup[]
  ): SignalStateFeatureCollection[] => {
    const red: SignalStateFeatureCollection = { ...prevSignalStates, features: [] };
    const yellow: SignalStateFeatureCollection = { ...prevSignalStates, features: [] };
    const green: SignalStateFeatureCollection = { ...prevSignalStates, features: [] };
    const yellowRed: SignalStateFeatureCollection = { ...prevSignalStates, features: [] };
    const redFlashing: SignalStateFeatureCollection = { ...prevSignalStates, features: [] };
    const unknown: SignalStateFeatureCollection = { ...prevSignalStates, features: [] };
    (prevSignalStates?.features ?? []).forEach((feature) => {
      feature.properties.color = parseSignalStateToColor(
        signalGroups?.find((signalGroup) => signalGroup.signalGroup == feature.properties.signalGroup)?.state
      );
      if (feature.properties.color == RED_LIGHT) red.features.push(feature);
      else if (feature.properties.color == YELLOW_LIGHT) yellow.features.push(feature);
      else if (feature.properties.color == GREEN_LIGHT) green.features.push(feature);
      else if (feature.properties.color == YELLOW_RED_LIGHT) yellowRed.features.push(feature);
      else if (feature.properties.color == GREEN_LIGHT) redFlashing.features.push(feature);
      else unknown.features.push(feature);
    });
    return [red, yellow, green, yellowRed, redFlashing, unknown];
  };

  //   useEffect(() => {
  //     setPointData(mapMessageData.mapFeatureCollection)
  //   }, []);

  const pullInitialData = async () => {
    if (!session?.accessToken || !props.intersectionId) {
      console.error(
        "Did not attempt to pull initial map data. Access token:",
        session?.accessToken,
        "Intersection ID:",
        props.intersectionId
      );
      return;
    }
    const rawMap: ProcessedMap[] = await MessageMonitorApi.getMapMessages({
      token: session?.accessToken,
      intersection_id: props.intersectionId?.toString(),
      //startTime: new Date(queryParams.startDate.getTime() - 1000 * 60 * 60 * 1),
      endTime: queryParams.endDate,
      latest: true,
    });
    if (!rawMap || rawMap.length == 0) {
      console.info("NO MAP MESSAGES WITHIN TIME");
      return;
    }
    const latestMapMessage: ProcessedMap = rawMap.at(-1)!;
    const mapSignalGroupsLocal = parseMapSignalGroups(latestMapMessage);
    setMapData(latestMapMessage);
    setMapSpatTimes((prevValue) => ({
      ...prevValue,
      mapTime: latestMapMessage.properties.odeReceivedAt as unknown as number,
    }));
    setMapSignalGroups(mapSignalGroupsLocal);
    if (latestMapMessage != null) {
      setViewState({
        latitude: latestMapMessage?.properties.refPoint.latitude,
        longitude: latestMapMessage?.properties.refPoint.longitude,
        zoom: 19,
      });
    } else {
      console.log("Cannot Zoom to Map Location");
    }

    setConnectingLanes(latestMapMessage.connectingLanesFeatureCollection);

    const rawSpat = await MessageMonitorApi.getSpatMessages({
      token: session?.accessToken,
      intersection_id: props.intersectionId?.toString(),
      startTime: queryParams.startDate,
      endTime: queryParams.endDate,
    });

    const spatSignalGroupsLocal = parseSpatSignalGroups(rawSpat);

    setSpatSignalGroups(spatSignalGroupsLocal);

    const mapCoordinates: OdePosition3D = latestMapMessage?.properties.refPoint;
    const rawBsm = await MessageMonitorApi.getBsmMessages({
      token: session?.accessToken,
      vehicleId: queryParams.vehicleId,
      startTime: queryParams.startDate,
      endTime: queryParams.endDate,
      long: mapCoordinates.longitude,
      lat: mapCoordinates.latitude,
      distance: 500,
    });
    const bsmGeojson = parseBsmToGeojson(rawBsm);
    const uniqueIds = new Set(bsmGeojson.features.map((bsm) => bsm.properties?.id));
    // generate equally spaced unique colors for each uniqueId
    const colors = generateColorDictionary(uniqueIds);
    setMapLegendColors((prevValue) => ({
      ...prevValue,
      bsmColors: colors,
    }));
    // add color to each feature
    const bsmLayerStyle = generateMapboxStyleExpression(colors);
    setBsmLayerStyle((prevValue) => ({ ...prevValue, paint: { ...prevValue.paint, "circle-color": bsmLayerStyle } }));
    setBsmData(bsmGeojson);

    rawData["map"] = rawMap;
    rawData["spat"] = rawSpat;
    rawData["bsm"] = rawBsm;
    if (props.sourceDataType == "notification") {
      rawData["notification"] = props.sourceData;
    } else if (props.sourceDataType == "event") {
      rawData["event"] = props.sourceData;
    } else if (props.sourceDataType == "assessment") {
      rawData["assessment"] = props.sourceData;
    }
    setRawData(rawData);

    const localSurroundingEvents = await EventsApi.getAllEvents(
      session?.accessToken,
      props.intersectionId,
      queryParams.startDate,
      queryParams.endDate
    );
    setSurroundingEvents(localSurroundingEvents);

    const localSurroundingNotifications = await NotificationApi.getAllNotifications({
      token: session?.accessToken,
      intersection_id: props.intersectionId?.toString(),
      startTime: queryParams.startDate,
      endTime: queryParams.endDate,
    });
    setSurroundingNotifications(localSurroundingNotifications);

    setSliderValue(
      Math.min(
        getTimeRange(queryParams.startDate, queryParams.eventDate ?? new Date()),
        getTimeRange(queryParams.startDate, queryParams.endDate)
      )
    );
  };

  useEffect(() => {
    const query_params = generateQueryParams(props.sourceData, props.sourceDataType);
    setQueryParams(query_params);
    setTimeWindowSeconds(60);
  }, [props.sourceData]);

  useEffect(() => {
    pullInitialData();
  }, [queryParams, props.intersectionId]);

  useEffect(() => {
    if (!mapSignalGroups || !spatSignalGroups) {
      console.error("BSM Loading: No map or SPAT data", mapSignalGroups, spatSignalGroups);
      return;
    }

    // retrieve filtered SPATs
    let closestSignalGroup: { spat: SpatSignalGroup[]; datetime: number } | null = null;
    for (const datetime in spatSignalGroups) {
      const datetimeNum = Number(datetime) / 1000;
      if (datetimeNum >= renderTimeInterval[0] && datetimeNum <= renderTimeInterval[1]) {
        if (
          closestSignalGroup === null ||
          Math.abs(datetimeNum - renderTimeInterval[1]) < Math.abs(closestSignalGroup.datetime - renderTimeInterval[1])
        ) {
          closestSignalGroup = { datetime: datetimeNum, spat: spatSignalGroups[datetime] };
        }
      }
    }
    if (closestSignalGroup !== null) {
      setCurrentSignalGroups(closestSignalGroup.spat);
      setSignalStateData(generateSignalStateFeatureCollection(mapSignalGroups, closestSignalGroup.spat));
      setMapSpatTimes((prevValue) => ({ ...prevValue, spatTime: closestSignalGroup!.datetime }));
    } else {
      setCurrentSignalGroups(undefined);
      setSignalStateData(undefined);
    }

    // retrieve filtered BSMs
    let start = performance.now();
    const filteredBsms: BsmFeature[] = [];
    (bsmData?.features ?? []).forEach((feature) => {
      if (
        feature.properties?.odeReceivedAt >= renderTimeInterval[0] &&
        feature.properties?.odeReceivedAt <= renderTimeInterval[1]
      ) {
        filteredBsms.push(feature);
      }
    });

    setCurrentBsms({ ...bsmData, features: filteredBsms });

    const filteredEvents: MessageMonitor.Event[] = [];
    surroundingEvents.forEach((event) => {
      if (
        event.eventGeneratedAt / 1000 >= renderTimeInterval[0] &&
        event.eventGeneratedAt / 1000 <= renderTimeInterval[1]
      ) {
        filteredEvents.push(event);
      }
    });
    setFilteredSurroundingEvents(filteredEvents);

    const filteredNotifications: MessageMonitor.Notification[] = [];
    surroundingNotifications.forEach((notification) => {
      if (
        notification.notificationGeneratedAt / 1000 >= renderTimeInterval[0] &&
        notification.notificationGeneratedAt / 1000 <= renderTimeInterval[1]
      ) {
        filteredNotifications.push(notification);
      }
    });
    setFilteredSurroundingNotifications(filteredNotifications);
  }, [bsmData, mapSignalGroups, renderTimeInterval, spatSignalGroups]);

  useEffect(() => {
    const startTime = queryParams.startDate.getTime() / 1000;
    const timeRange = getTimeRange(queryParams.startDate, queryParams.endDate);

    const filteredStartTime = startTime + sliderValue - timeWindowSeconds;
    const filteredEndTime = startTime + sliderValue;

    setRenderTimeInterval([filteredStartTime, filteredEndTime]);
  }, [sliderValue, queryParams, timeWindowSeconds]);

  const getTimeRange = (startDate: Date, endDate: Date) => {
    return (endDate.getTime() - startDate.getTime()) / 1000;
  };

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    setSliderValue(newValue as number);
  };

  const downloadJsonFile = (contents: any, name: string) => {
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(contents)], {
      type: "text/plain",
    });
    element.href = URL.createObjectURL(file);
    element.download = name;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
  };

  const downloadAllData = () => {
    downloadJsonFile(rawData["map"], `intersection_${props.intersectionId}_MAP_data.json`);
    downloadJsonFile(rawData["spat"], `intersection_${props.intersectionId}_SPAT_data.json`);
    downloadJsonFile(rawData["bsm"], `intersection_${props.intersectionId}_BSM_data.json`);
    downloadJsonFile(rawData["notification"], `intersection_${props.intersectionId}_Notification_data.json`);
  };

  const onTimeQueryChanged = (
    eventTime: Date = new Date(),
    timeBefore?: number,
    timeAfter?: number,
    timeWindowSeconds?: number
  ) => {
    const updatedQueryParams = {
      startDate: new Date(eventTime.getTime() - (timeBefore ?? 0) * 1000),
      endDate: new Date(eventTime.getTime() + (timeAfter ?? 0) * 1000),
      eventDate: eventTime,
    };
    if (
      queryParams.startDate.getTime() != updatedQueryParams.startDate.getTime() ||
      queryParams.endDate.getTime() != updatedQueryParams.endDate.getTime() ||
      queryParams.eventDate.getTime() != updatedQueryParams.eventDate.getTime()
    ) {
      // Detected change in query params
      setQueryParams(updatedQueryParams);
    } else {
      // No change in query params
    }
    setTimeWindowSeconds((prevState) => timeWindowSeconds ?? prevState);
  };

  const onClickMap = (e) => {
    const features = mapRef.current.queryRenderedFeatures(e.point, {
      //   layers: allInteractiveLayerIds,
    });

    const feature = features?.[0];
    if (feature && allInteractiveLayerIds.includes(feature.layer.id)) {
      setSelectedFeature({ clickedLocation: e.lngLat, feature });
    } else {
      setSelectedFeature(undefined);
    }
  };

  return (
    <Container fluid={true} style={{ width: "100%", height: "100%", display: "flex" }}>
      <Col className="mapContainer" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "0px 0px 6px 12px",
            marginTop: "6px",
            marginLeft: "35px",
            position: "absolute",
            zIndex: 10,
            top: 0,
            left: 0,
            // width: 1200,
            width: "calc(100% - 500px)",
            borderRadius: "4px",
            fontSize: "16px",
            maxHeight: "calc(100vh - 120px)",
            overflow: "auto",
            scrollBehavior: "auto",
          }}
        >
          <Box style={{ position: "relative" }}>
            <Paper sx={{ pt: 1, pb: 1, opacity: 0.85 }}>
              <ControlPanel
                sx={{ flex: 0 }}
                sliderValue={sliderValue}
                sliderTimeValue={{
                  start: new Date((queryParams.startDate.getTime() / 1000 + sliderValue - timeWindowSeconds) * 1000),
                  end: new Date((queryParams.startDate.getTime() / 1000 + sliderValue) * 1000),
                }}
                setSlider={handleSliderChange}
                downloadAllData={downloadAllData}
                timeQueryParams={{ ...queryParams, timeWindowSeconds }}
                onTimeQueryChanged={onTimeQueryChanged}
                mapSpatTimes={mapSpatTimes}
                max={getTimeRange(queryParams.startDate, queryParams.endDate)}
              />
            </Paper>
          </Box>
        </div>
        <div
          style={{
            padding: "0px 0px 6px 12px",
            position: "absolute",
            zIndex: 9,
            bottom: 0,
            left: 0,
            fontSize: "16px",
            overflow: "auto",
            scrollBehavior: "auto",
          }}
        >
          <Box style={{ position: "relative" }}>
            <MapLegend
              bsmColors={mapLegendColors.bsmColors}
              laneColors={mapLegendColors.laneColors}
              travelConnectionColors={mapLegendColors.travelConnectionColors}
            />
          </Box>
        </div>

        <Map
          {...viewState}
          ref={mapRef}
          onLoad={() => {
            //     mapRef.current.addImage("pulsing-dot", pulsingDot, { pixelRatio: 2 });
          }}
          mapStyle={publicRuntimeConfig.MAPBOX_STYLE_URL!}
          mapboxAccessToken={MAPBOX_API_TOKEN}
          attributionControl={true}
          customAttribution={['<a href="https://www.cotrip.com/" target="_blank">© CDOT</a>']}
          styleDiffing
          style={{ width: "100%", height: "100%" }}
          onMove={(evt) => setViewState(evt.viewState)}
          onClick={onClickMap}
          // onMouseDown={this.onMouseDown}
          // onMouseUp={this.onMouseUp}
          // interactiveLayerIds={interactiveLayerIds}
          // cursor={cursor}
          // onMouseEnter={() => this.setState({ cursor: "pointer" })}
          // onMouseLeave={() => this.setState({ cursor: "grab" })}
        >
          {/* {
            <Source
              type="geojson"
              data={{
                type: "FeatureCollection",
                features: [
                  {
                    type: "Feature",
                    properties: {},
                    geometry: {
                      type: "Point",
                      coordinates: [0, 0],
                    },
                  },
                ],
              }}
            >
              <Layer {...pulsingDotLayer} />
            </Source>
          } */}
          {connectingLanes && currentSignalGroups && (
            <Source
              type="geojson"
              data={{
                type: "FeatureCollection",
                features: addConnections(connectingLanes, currentSignalGroups).features.filter(
                  (feature) => feature.properties.signalState == "PRE_MOVEMENT"
                ),
              }}
            >
              <Layer {...connectingLanesPreMovementLayer} />
            </Source>
          )}
          {connectingLanes && currentSignalGroups && (
            <Source type="geojson" data={addConnections(connectingLanes, currentSignalGroups)}>
              <Layer {...connectingLanesLayer} />
            </Source>
          )}
          {currentBsms && (
            <Source type="geojson" data={currentBsms}>
              <Layer {...bsmLayerStyle} />
            </Source>
          )}
          {mapData && (
            <Source type="geojson" data={mapData?.mapFeatureCollection}>
              <Layer {...mapMessageLayer} />
            </Source>
          )}
          {connectingLanes && currentSignalGroups && signalStateData && (
            <Source type="geojson" data={signalStateData[0]}>
              <Layer {...signalStateLayerRed} />
            </Source>
          )}
          {connectingLanes && currentSignalGroups && signalStateData && (
            <Source type="geojson" data={signalStateData[1]}>
              <Layer {...signalStateLayerYellow} />
            </Source>
          )}
          {connectingLanes && currentSignalGroups && signalStateData && (
            <Source type="geojson" data={signalStateData[2]}>
              <Layer {...signalStateLayerGreen} />
            </Source>
          )}
          {connectingLanes && currentSignalGroups && signalStateData && (
            <Source type="geojson" data={signalStateData[3]}>
              <Layer {...signalStateLayerYellowRed} />
            </Source>
          )}
          {connectingLanes && currentSignalGroups && signalStateData && (
            <Source type="geojson" data={signalStateData[4]}>
              <Layer {...signalStateLayerRedFlashing} />
            </Source>
          )}
          {connectingLanes && currentSignalGroups && signalStateData && (
            <Source type="geojson" data={signalStateData[5]}>
              <Layer {...signalStateLayerUnknown} />
            </Source>
          )}
          {mapData && props.sourceData && props.sourceDataType == "notification" && (
            <Source
              type="geojson"
              data={createMarkerForNotification(
                [0, 0],
                props.sourceData as MessageMonitor.Notification,
                mapData.mapFeatureCollection
              )}
            >
              <Layer {...markerLayer} />
            </Source>
          )}
          {selectedFeature && (
            <CustomPopup selectedFeature={selectedFeature} onClose={() => setSelectedFeature(undefined)} />
          )}
        </Map>
        <SidePanel
          laneInfo={connectingLanes}
          signalGroups={currentSignalGroups}
          bsms={currentBsms}
          events={filteredSurroundingEvents}
          notifications={filteredSurroundingNotifications}
          sourceData={props.sourceData}
          sourceDataType={props.sourceDataType}
        />
      </Col>
    </Container>
  );
};

export default MapTab;
