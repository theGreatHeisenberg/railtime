"use client";

import { Station, TrainPrediction } from "@/lib/types";

interface TerminalCorridorViewProps {
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

export default function TerminalCorridorView({
    train,
    origin,
    stations,
    destination: passedDestination,
    vehiclePositions = [],
    currentTime: passedCurrentTime,
    originPredictions: passedOriginPredictions = [],
}: TerminalCorridorViewProps) {
    const vehiclePosition = vehiclePositions.find(p => p.Vehicle?.Trip?.TripId === train.TrainNumber) || null;
    const currentTime = passedCurrentTime || new Date();

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

        let segmentStartIdx = closestIdx;
        let segmentEndIdx = closestIdx;
        let interpolationFactor = 0;

        if (closestIdx > 0) {
            const prevStation = sortedStations[closestIdx - 1];
            const currStation = sortedStations[closestIdx];
            const distToPrev = getDistance(trainLat, trainLon, prevStation.lat, prevStation.lon);
            const distToCurr = getDistance(trainLat, trainLon, currStation.lat, currStation.lon);
            const segmentLength = getDistance(prevStation.lat, prevStation.lon, currStation.lat, currStation.lon);

            if (distToPrev + distToCurr <= segmentLength * 1.2) {
                segmentStartIdx = closestIdx - 1;
                segmentEndIdx = closestIdx;
                interpolationFactor = distToPrev / segmentLength;
            }
        }

        const startPercent = normalizedStations[segmentStartIdx].percent;
        const endPercent = normalizedStations[segmentEndIdx].percent;
        const interpolatedPercent = startPercent + (endPercent - startPercent) * interpolationFactor;

        return {
            percent: interpolatedPercent,
            stationIdx: closestIdx,
        };
    };

    const trainData = getTrainPercent();
    const trainPercent = trainData?.percent ?? null;

    const originStation = normalizedStations.find(s => s.stopname === origin);
    const originIdx = normalizedStations.findIndex(s => s.stopname === origin);

    // Take max 12 stations around the train
    const MAX_VISIBLE = 12;
    let visibleStations = normalizedStations;

    if (originIdx !== -1) {
        const focusIdx = trainPercent !== null ? (trainData?.stationIdx ?? originIdx) : originIdx;
        let startIdx = Math.max(0, focusIdx - 3);
        let endIdx = Math.min(normalizedStations.length - 1, startIdx + MAX_VISIBLE - 1);

        if (endIdx - startIdx + 1 < MAX_VISIBLE) {
            startIdx = Math.max(0, endIdx - MAX_VISIBLE + 1);
        }

        visibleStations = normalizedStations.slice(startIdx, endIdx + 1);
    }

    // Build ASCII corridor visualization with colored stations
    const corridorWidth = 60;

    // Track station information by position
    const stationMap = new Map<number, {
        name: string;
        isPassed: boolean;
        isOrigin: boolean;
        isDestination: boolean;
    }>();

    const minPercent = visibleStations[0].percent;
    const maxPercent = visibleStations[visibleStations.length - 1].percent;
    const range = maxPercent - minPercent || 100;

    // Place stations
    visibleStations.forEach((station) => {
        const displayPercent = range > 0 ? ((station.percent - minPercent) / range) * 100 : 50;
        const pos = Math.round((displayPercent / 100) * (corridorWidth - 1));

        if (pos >= 0 && pos < corridorWidth) {
            const isPassed = trainPercent !== null && (train.Direction === "SB"
                ? station.percent / 100 <= trainPercent
                : station.percent / 100 >= trainPercent);

            stationMap.set(pos, {
                name: station.stopname,
                isPassed: isPassed,
                isOrigin: station.stopname === origin,
                isDestination: station.stopname === passedDestination,
            });
        }
    });

    // Build rail line with station positions
    const railLine = Array(corridorWidth).fill('─').map((char, idx) => {
        if (stationMap.has(idx)) {
            const station = stationMap.get(idx)!;
            if (station.isOrigin) return '●'; // Blue (origin)
            if (station.isDestination) return '●'; // Orange (destination)
            if (station.isPassed) return '●'; // Grey (passed)
            return '○'; // Hollow (unvisited)
        }
        return char;
    });

    // Place train indicator
    let trainPos: number | null = null;
    if (trainPercent !== null) {
        const displayPercent = range > 0 ? ((trainPercent - minPercent) / range) * 100 : 50;
        trainPos = Math.round((displayPercent / 100) * (corridorWidth - 1));
    }

    // Build colored corridor line
    const getStationColor = (pos: number): string => {
        const station = stationMap.get(pos);
        if (!station) return 'text-cyan-500';
        if (station.isOrigin) return 'text-blue-400';
        if (station.isDestination) return 'text-orange-400';
        if (station.isPassed) return 'text-gray-500';
        return 'text-cyan-400';
    };

    const getRealTimeETA = (predictions: TrainPrediction[]): number => {
        const prediction = predictions.find(p => p.TrainNumber === train.TrainNumber);
        if (prediction) {
            const etaMinutes = parseInt(prediction.ETA.match(/\d+/) ? prediction.ETA.match(/\d+/)![0] : "0");
            return Math.max(0, etaMinutes);
        }
        return 0;
    };

    const etaToOriginMinutes = getRealTimeETA(passedOriginPredictions || []);

    return (
        <div className="w-full bg-black text-cyan-300 font-mono text-sm space-y-3 p-4 rounded-lg border border-cyan-500/30">
            {/* Header */}
            <div className="text-cyan-400 font-bold tracking-widest border-b border-cyan-500/30 pb-2">
                ╔═══ CORRIDOR VISUALIZATION ═══╗
            </div>

            {/* Train Status */}
            <div className="flex items-center justify-between text-xs">
                <span className="text-green-400">
                    Train #{train.TrainNumber}
                </span>
                <span className={`${
                    train.delayStatus === "delayed" ? "text-red-400" :
                    train.delayStatus === "early" ? "text-blue-400" : "text-green-400"
                }`}>
                    {train.delayStatus === "delayed" ? `+${train.delayMinutes}m LATE` :
                     train.delayStatus === "early" ? `−${Math.abs(train.delayMinutes!)}m EARLY` :
                     "ON TIME"}
                </span>
            </div>

            {/* Direction and Corridor */}
            <div className="bg-black border border-cyan-500/20 p-3 space-y-3">
                {/* Direction Indicators */}
                <div className="flex items-center justify-between text-[10px] text-cyan-600 tracking-widest">
                    <span>{train.Direction === "SB" ? "← SOUTHBOUND" : "NORTHBOUND →"}</span>
                    <span className="text-cyan-500">{trainPercent !== null ? Math.round(trainPercent * 100) : 0}% progress</span>
                </div>

                {/* ASCII Corridor with colored stations */}
                <div className="relative">
                    <div className="text-cyan-500 tracking-widest text-xs font-bold">
                        {railLine.map((char, idx) => {
                            const color = getStationColor(idx);
                            const isTrainPos = idx === trainPos;
                            return (
                                <span key={idx} className={isTrainPos ? "text-green-400 font-bold" : color}>
                                    {isTrainPos ? "▶" : char}
                                </span>
                            );
                        })}
                    </div>
                </div>

                {/* Legend */}
                <div className="text-[9px] space-y-0.5 border-t border-cyan-500/20 pt-2">
                    <div className="flex gap-3">
                        <span><span className="text-blue-400">●</span> Origin</span>
                        <span><span className="text-orange-400">●</span> Destination</span>
                        <span><span className="text-gray-500">●</span> Passed</span>
                        <span><span className="text-cyan-400">○</span> Unvisited</span>
                        <span><span className="text-green-400">▶</span> Train</span>
                    </div>
                </div>
            </div>

            {/* Status Info */}
            <div className="border-t border-cyan-500/30 pt-2 text-xs space-y-1">
                <div className="text-green-400">
                    {etaToOriginMinutes > 0
                        ? `ARRIVAL at ${origin} in ${etaToOriginMinutes}m`
                        : `DEPARTED from ${origin}`
                    }
                </div>
                <div className="text-cyan-500">
                    Type: {train.TrainType} | {train.Direction === "SB" ? "↓ Moving South" : "↑ Moving North"}
                </div>
            </div>
        </div>
    );
}
