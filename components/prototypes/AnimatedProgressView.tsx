"use client";

import { useEffect, useState, useRef } from "react";
import { Station, TrainPrediction, VehiclePosition } from "@/lib/types";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

interface AnimatedProgressViewProps {
  train: TrainPrediction;
  origin: string;
  stations: Station[];
  destination?: string;
  vehiclePositions?: any[];
  currentTime?: Date;
  originPredictions?: TrainPrediction[];
  destinationPredictions?: TrainPrediction[];
  loading?: boolean;
  stationETAMap?: Record<string, { etaMinutes: number; arrivalTime: string }>;
}

export default function AnimatedProgressView({
  train,
  origin,
  stations,
  destination: passedDestination,
  vehiclePositions = [],
  currentTime: passedCurrentTime,
  originPredictions: passedOriginPredictions = [],
  destinationPredictions: passedDestinationPredictions = [],
  loading = false,
  stationETAMap,
}: AnimatedProgressViewProps) {
  const { theme } = useTheme();
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);
  const [expandedBefore, setExpandedBefore] = useState(false);
  const [expandedAfter, setExpandedAfter] = useState(false);
  const stationsContainerRef = useRef<HTMLDivElement>(null);

  // Use passed data, fall back to default values if not provided
  const vehiclePosition = vehiclePositions.find(p => p.Vehicle?.Trip?.TripId === train.TrainNumber) || null;
  const currentTime = passedCurrentTime || new Date();
  const originPredictions = passedOriginPredictions;
  const destinationPredictions = passedDestinationPredictions;

  const sortedStations = [...stations].sort((a, b) => {
    const idA = parseInt(a.stop1);
    const idB = parseInt(b.stop1);
    return idA - idB;
  });

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  let totalDist = 0;
  const stationPositions = sortedStations.map((station, i) => {
    if (i > 0) {
      const prev = sortedStations[i - 1];
      totalDist += getDistance(prev.lat, prev.lon, station.lat, station.lon);
    }
    return { ...station, dist: totalDist };
  });

  const normalizedStations = stationPositions.map(s => ({
    ...s,
    percent: totalDist > 0 ? (s.dist / totalDist) * 100 : 0
  }));


  // Auto-scroll to focus on train position
  useEffect(() => {
    if (stationsContainerRef.current && trainProgress !== null && trainProgress > 0) {
      const trainPosition = trainProgress * 100;
      const scrollHeight = stationsContainerRef.current.scrollHeight;
      const containerHeight = stationsContainerRef.current.clientHeight;
      const targetScroll = (trainPosition / 100) * scrollHeight - containerHeight / 2;

      stationsContainerRef.current.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "smooth"
      });
    }
  }, [vehiclePosition]);

  const getTrainPercent = () => {
    if (!vehiclePosition) return null;
    const trainLat = vehiclePosition.Vehicle.Position.Latitude;
    const trainLon = vehiclePosition.Vehicle.Position.Longitude;

    let closestIdx = 0;
    let minD = Infinity;

    sortedStations.forEach((s, i) => {
      const d = getDistance(trainLat, trainLon, s.lat, s.lon);
      if (d < minD) {
        minD = d;
        closestIdx = i;
      }
    });

    return (normalizedStations[closestIdx].percent / 100);
  };

  const trainProgress = getTrainPercent() ?? 0;

  // Use real-time prediction if available, otherwise fall back to train.ETA
  const getRealTimeETA = (predictions: TrainPrediction[]): number => {
    const prediction = predictions.find(p => p.TrainNumber === train.TrainNumber);
    if (prediction) {
      const etaMinutes = parseInt(prediction.ETA.match(/\d+/) ? prediction.ETA.match(/\d+/)![0] : "0");
      return Math.max(0, etaMinutes); // Return 0 if ETA is in the past
    }
    return parseInt(train.ETA.match(/\d+/) ? train.ETA.match(/\d+/)![0] : "0");
  };

  // Get ETA from real-time predictions
  const etaToOriginMinutes = getRealTimeETA(originPredictions);
  const etaToDestinationMinutes = getRealTimeETA(destinationPredictions);

  const delayColor = train.delayStatus === "delayed" ? "from-red-500 to-red-600" :
    train.delayStatus === "early" ? "from-blue-500 to-blue-600" : "from-green-500 to-green-600";

  const delayTextColor = train.delayStatus === "delayed" ? "text-red-400" :
    train.delayStatus === "early" ? "text-blue-400" : "text-green-400";

  const delayLabel = train.delayStatus === "delayed" ? `${train.delayMinutes}m LATE` :
    train.delayStatus === "early" ? `${Math.abs(train.delayMinutes!)}m EARLY` : "ON TIME";

  const getIsPassed = (stationPercent: number): boolean => {
    if (train.Direction === "SB") {
      return stationPercent / 100 <= trainProgress;
    } else {
      return stationPercent / 100 >= trainProgress;
    }
  };

  const originStation = normalizedStations.find(s => s.stopname === origin);
  const trainReachedOrigin = originStation && trainProgress >= (originStation.percent / 100);

  // Use passed destination prop if available, otherwise use last stop from train
  const destination = passedDestination || (() => {
    const lastStopId = train.stopIds[train.stopIds.length - 1];
    const destStation = stations.find(s => s.stop1 === lastStopId || s.stop2 === lastStopId);
    return destStation?.stopname || null;
  })();

  const destStation = normalizedStations.find(s => s.stopname === destination);

  const originPercent = originStation?.percent ?? 0;
  const destPercent = destStation?.percent ?? 100;

  // Use destination ETA from predictions, or calculate if not available
  let calculatedEtaToDestination = etaToDestinationMinutes;
  if (etaToDestinationMinutes === 0 && originPercent > 0 && destPercent > 0) {
    // Fallback: calculate based on distance ratio only if no prediction available
    calculatedEtaToDestination = Math.round(etaToOriginMinutes * (destPercent / originPercent));
  }

  // Get absolute arrival time based on current time + ETA
  const getArrivalTime = (etaMinutes: number): string => {
    const arrivalDate = new Date(currentTime.getTime() + etaMinutes * 60000);
    return arrivalDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get ETA for a station from pre-calculated map
  const getStationETA = (stationName: string): { relativeMinutes: number; arrivalTime: string } => {
    // Use pre-calculated ETA from the map
    if (stationETAMap && stationETAMap[stationName]) {
      const eta = stationETAMap[stationName];
      return {
        relativeMinutes: eta.etaMinutes,
        arrivalTime: eta.arrivalTime
      };
    }

    // Fallback if no ETA map or station not found
    if (loading) {
      return { relativeMinutes: -1, arrivalTime: "Loading..." };
    }
    return { relativeMinutes: 0, arrivalTime: "--:--" };
  };

  // Smart station filtering: show origin ±2 stations + destination
  const getVisibleStations = () => {
    if (!originStation) return normalizedStations;

    const originIdx = normalizedStations.findIndex(s => s.stopname === origin);
    if (originIdx === -1) return normalizedStations;

    let visibleIndices = new Set<number>();

    // Always include origin
    visibleIndices.add(originIdx);

    // Include 2 stations before origin
    for (let i = Math.max(0, originIdx - 2); i < originIdx; i++) {
      visibleIndices.add(i);
    }

    // Include 2 stations after origin
    for (let i = originIdx + 1; i <= Math.min(normalizedStations.length - 1, originIdx + 2); i++) {
      visibleIndices.add(i);
    }

    // Always include destination
    if (destStation) {
      const destIdx = normalizedStations.findIndex(s => s.stopname === destination);
      if (destIdx !== -1) {
        visibleIndices.add(destIdx);
      }
    }

    return Array.from(visibleIndices)
      .sort((a, b) => a - b)
      .map(idx => normalizedStations[idx]);
  };

  // Get stations before visible range for expand button
  const getHiddenBefore = () => {
    if (!originStation) return [];

    const originIdx = normalizedStations.findIndex(s => s.stopname === origin);
    if (originIdx <= 2) return [];

    return normalizedStations.slice(0, originIdx - 2);
  };

  // Get stations after visible range for expand button
  const getHiddenAfter = () => {
    if (!originStation || !destStation) return [];

    const originIdx = normalizedStations.findIndex(s => s.stopname === origin);
    const destIdx = normalizedStations.findIndex(s => s.stopname === destination);

    if (destIdx === -1 || destIdx <= originIdx + 2) return [];

    return normalizedStations.slice(originIdx + 3, destIdx);
  };

  const visibleStations = expandedBefore || expandedAfter ? normalizedStations : getVisibleStations();
  const hiddenBefore = getHiddenBefore();
  const hiddenAfter = getHiddenAfter();

  const progressBarPercent = trainProgress * 100;

  return (
    <div className={`relative w-full h-full bg-gradient-to-br ${theme.gradients.main} rounded-lg p-6 flex flex-col overflow-hidden transition-colors duration-500`}>
      {/* Title with Direction */}
      <div className="mb-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <h3 className={`text-xl font-bold ${theme.colors.text.primary}`}>Timeline</h3>
          {loading && (
            <div className="w-4 h-4 rounded-full border-2 border-transparent border-t-current animate-spin" />
          )}
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${
            train.Direction === "SB"
              ? "bg-blue-500/30 text-blue-300"
              : "bg-purple-500/30 text-purple-300"
          }`}>
            {train.Direction === "SB" ? "↓ South" : "↑ North"}
          </span>
        </div>
        <p className={`text-sm ${theme.colors.text.muted} mt-1`}>
          {loading ? "Loading station data..." : trainReachedOrigin ? `Heading to ${destination}` : `Arriving at ${origin} in ${etaToOriginMinutes}m`}
        </p>
      </div>

      {/* Main Content: Integrated Station Rows with Progress Bars */}
      <div
        ref={stationsContainerRef}
        className="flex-1 overflow-y-auto space-y-0 pr-2"
        style={{
          scrollBehavior: "smooth"
        }}
      >
        {/* Expand button for stations before */}
        {hiddenBefore.length > 0 && !expandedBefore && (
          <button
            onClick={() => setExpandedBefore(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 rounded transition-colors"
          >
            <ChevronUp className="w-3 h-3" />
            Show {hiddenBefore.length} stations
            <ChevronUp className="w-3 h-3" />
          </button>
        )}

        {/* Collapse button for stations before (when expanded) */}
        {expandedBefore && hiddenBefore.length > 0 && (
          <button
            onClick={() => setExpandedBefore(false)}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 rounded transition-colors"
          >
            <ChevronUp className="w-3 h-3" />
            Hide {hiddenBefore.length} stations
            <ChevronUp className="w-3 h-3" />
          </button>
        )}

        {/* Station Rows with Integrated Progress Bars */}
        {visibleStations.map((station, idx) => {
          const visibleIdx = visibleStations.findIndex(s => s.stopname === station.stopname);
          const isFirst = visibleIdx === 0;
          const isLast = visibleIdx === visibleStations.length - 1;
          const nextStation = visibleStations[visibleIdx + 1];

          const isOrigin = station.stopname === origin;
          const isPassed = getIsPassed(station.percent);
          const isCurrentStop = station.stopname === origin && !trainReachedOrigin;
          const isDestination = destination && station.stopname === destination;
          const stopIdToCheck = train.Direction === "NB" ? station.stop1 : station.stop2;
          const isScheduledStop = train.stopIds.includes(stopIdToCheck);
          const isHovered = hoveredStation === station.stopname;

          const { relativeMinutes, arrivalTime } = getStationETA(station.stopname);

          // Determine color of line segment BELOW this station
          const getLineBelowColor = (): string => {
            if (isLast) return "transparent";
            if (isPassed && nextStation) {
              const nextIsPassed = getIsPassed(nextStation.percent);
              if (nextIsPassed) return theme.colors.progress.passed;
            }
            return theme.colors.progress.upcoming;
          };

          return (
            <div
              key={station.stopname}
              className="flex items-stretch"
              onMouseEnter={() => setHoveredStation(station.stopname)}
              onMouseLeave={() => setHoveredStation(null)}
            >
              {/* Progress Bar Column - Fixed width */}
              <div className="w-8 flex-shrink-0 flex flex-col items-center relative">
                {/* Line segment ABOVE the dot (connects from previous station) */}
                {!isFirst && (
                  <div
                    className="w-1 flex-1 transition-colors duration-500"
                    style={{
                      backgroundColor: isPassed ? theme.colors.progress.passed : theme.colors.progress.upcoming
                    }}
                  />
                )}

                {/* Station Dot Container */}
                <div className="relative flex items-center justify-center py-1">
                  {/* Pulse ring for current station (if train hasn't reached origin yet) */}
                  {isCurrentStop && (
                    <div className="absolute w-5 h-5 rounded-full bg-cyan-400/30 animate-pulse" />
                  )}

                  {/* Station dot */}
                  <div
                    className="w-3 h-3 rounded-full border-2 z-10 transition-all duration-300"
                    style={{
                      backgroundColor: isOrigin ? theme.colors.progress.origin : isPassed ? theme.colors.progress.current : theme.colors.progress.upcoming,
                      borderColor: isOrigin ? theme.colors.progress.origin : isPassed ? theme.colors.progress.current : theme.colors.progress.upcoming
                    }}
                  />
                </div>

                {/* Line segment BELOW the dot (connects to next station) */}
                {!isLast && (
                  <div
                    className="w-1 flex-1 transition-colors duration-500"
                    style={{
                      backgroundColor: getLineBelowColor()
                    }}
                  />
                )}
              </div>

              {/* Station Info */}
              <div
                className="flex-1 flex items-center justify-between py-3 ml-3 px-3 rounded-lg transition-all duration-300 cursor-pointer"
                style={{
                  backgroundColor: isHovered ? "rgba(100, 150, 200, 0.15)" : isOrigin ? "rgba(251, 191, 36, 0.1)" : isPassed ? "rgba(6, 182, 212, 0.05)" : "rgba(0, 0, 0, 0.2)",
                  borderLeft: `3px solid ${isPassed ? "#06b6d4" : isOrigin ? "#fbbf24" : isScheduledStop ? "#64748b" : "#334155"}`
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className="font-medium text-sm transition-colors duration-300"
                    style={{
                      color: isOrigin ? "#fcd34d" : isPassed ? "#67e8f9" : "#cbd5e1"
                    }}
                  >
                    {station.stopname}
                  </span>

                  {isOrigin && (
                    <span className="text-xs bg-yellow-500/30 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-600/50 font-semibold whitespace-nowrap">
                      ORIGIN
                    </span>
                  )}
                  {isDestination && (
                    <span className="text-xs bg-cyan-500/30 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-600/50 font-semibold whitespace-nowrap">
                      DESTINATION
                    </span>
                  )}
                  {isScheduledStop && !isOrigin && !isDestination && (
                    <span className="text-xs bg-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                      🚂 Stop
                    </span>
                  )}
                  {!isScheduledStop && !isOrigin && !isDestination && (
                    <span className="text-xs bg-slate-800/50 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                      ⊘ Express
                    </span>
                  )}
                </div>

                {/* ETA and Status */}
                <div className="flex flex-col items-end gap-0.5 ml-auto flex-shrink-0">
                  {!isPassed && (
                    <>
                      {relativeMinutes === -1 ? (
                        <>
                          <div className="text-xs font-semibold text-slate-400 whitespace-nowrap">--</div>
                          <div className="text-xs text-slate-600 whitespace-nowrap">Loading...</div>
                        </>
                      ) : (
                        <>
                          <div className={`text-xs font-semibold whitespace-nowrap ${delayTextColor}`}>
                            {relativeMinutes}m
                          </div>
                          <div className="text-xs text-slate-500 whitespace-nowrap">
                            {arrivalTime}
                          </div>
                        </>
                      )}
                    </>
                  )}
                  {isPassed && (
                    <div className="text-cyan-400 text-xs font-bold">✓ PASSED</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Expand button for stations after */}
        {hiddenAfter.length > 0 && !expandedAfter && (
          <button
            onClick={() => setExpandedAfter(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 rounded transition-colors"
          >
            <ChevronDown className="w-3 h-3" />
            Show {hiddenAfter.length} stations
            <ChevronDown className="w-3 h-3" />
          </button>
        )}

        {/* Collapse button for stations after (when expanded) */}
        {expandedAfter && hiddenAfter.length > 0 && (
          <button
            onClick={() => setExpandedAfter(false)}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 rounded transition-colors"
          >
            <ChevronDown className="w-3 h-3" />
            Hide {hiddenAfter.length} stations
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
      </div>

    </div>
  );
}
