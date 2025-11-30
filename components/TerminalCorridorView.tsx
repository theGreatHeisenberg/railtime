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
    originPredictions: passedOriginPredictions = [],
}: TerminalCorridorViewProps) {
    const vehiclePosition = vehiclePositions.find(p => p.Vehicle?.Trip?.TripId === train.TrainNumber) || null;

    const sortedStations = [...stations].sort((a, b) => {
        const idA = parseInt(a.stop1);
        const idB = parseInt(b.stop1);
        return idA - idB;
    });

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
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
        return (normalizedStations[closestIdx].percent / 100);
    };

    const trainProgress = getTrainPercent() ?? 0.5;

    const originIdx = normalizedStations.findIndex(s => s.stopname === origin);
    const destIdx = normalizedStations.findIndex(s => s.stopname === passedDestination);

    // Build simple corridor with only key elements
    const buildCorridorDots = () => {
        const dots: Array<{ type: 'station' | 'train' | 'separator'; color: string; label?: string; hiddenCount?: number; isDotted?: boolean }> = [];

        // Find most recently passed station (closest to train but before it)
        let recentlyPassedIdx = -1;
        let closestDistToPassed = Infinity;

        for (let i = 0; i < normalizedStations.length; i++) {
            const stationProgress = normalizedStations[i].percent / 100;
            const isPassed = train.Direction === "SB"
                ? stationProgress > trainProgress
                : stationProgress <= trainProgress;

            if (isPassed) {
                const distToPassed = Math.abs(stationProgress - trainProgress);
                if (distToPassed < closestDistToPassed) {
                    closestDistToPassed = distToPassed;
                    recentlyPassedIdx = i;
                }
            }
        }

        // Find nearest upcoming station (closest to train but after it)
        let nearestUpcomingIdx = -1;
        let closestDistToUpcoming = Infinity;

        for (let i = 0; i < normalizedStations.length; i++) {
            const stationProgress = normalizedStations[i].percent / 100;
            const isUpcoming = train.Direction === "SB"
                ? stationProgress < trainProgress
                : stationProgress > trainProgress;

            if (isUpcoming) {
                const distToUpcoming = Math.abs(stationProgress - trainProgress);
                if (distToUpcoming < closestDistToUpcoming) {
                    closestDistToUpcoming = distToUpcoming;
                    nearestUpcomingIdx = i;
                }
            }
        }

        // Add recently passed station
        if (recentlyPassedIdx !== -1) {
            const station = normalizedStations[recentlyPassedIdx];
            dots.push({ type: 'station', color: 'text-gray-500', label: station.stopname });

            // Count stations between recently passed and train
            let hiddenBetween = 0;
            const minIdx = Math.min(recentlyPassedIdx, trainIdx);
            const maxIdx = Math.max(recentlyPassedIdx, trainIdx);
            for (let i = minIdx + 1; i < maxIdx; i++) {
                hiddenBetween++;
            }
            if (hiddenBetween > 0) {
                dots.push({ type: 'separator', color: 'text-cyan-600', hiddenCount: hiddenBetween });
            } else {
                dots.push({ type: 'separator', color: 'text-cyan-600' });
            }
        } else {
            dots.push({ type: 'separator', color: 'text-cyan-600' });
        }

        dots.push({ type: 'train', color: 'text-green-400' });

        // Count stations between train and origin, use dotted separator if origin is nearest upcoming
        let hiddenToOrigin = 0;
        if (originIdx !== -1) {
            const minIdx = Math.min(trainIdx, originIdx);
            const maxIdx = Math.max(trainIdx, originIdx);
            for (let i = minIdx + 1; i < maxIdx; i++) {
                hiddenToOrigin++;
            }
            const isDottedSeparator = originIdx === nearestUpcomingIdx;
            dots.push({
                type: 'separator',
                color: 'text-cyan-600',
                hiddenCount: hiddenToOrigin > 0 ? hiddenToOrigin : undefined,
                isDotted: isDottedSeparator
            });

            const station = normalizedStations[originIdx];
            dots.push({ type: 'station', color: 'text-blue-400', label: station.stopname });
        }

        // Add separator and destination if it exists
        if (destIdx !== -1) {
            let hiddenToDest = 0;
            const minIdx = Math.min(originIdx, destIdx);
            const maxIdx = Math.max(originIdx, destIdx);
            for (let i = minIdx + 1; i < maxIdx; i++) {
                hiddenToDest++;
            }
            const isDottedSeparator = destIdx === nearestUpcomingIdx;
            dots.push({
                type: 'separator',
                color: 'text-cyan-600',
                hiddenCount: hiddenToDest > 0 ? hiddenToDest : undefined,
                isDotted: isDottedSeparator
            });
            const station = normalizedStations[destIdx];
            dots.push({ type: 'station', color: 'text-orange-400', label: station.stopname });
        }

        return dots;
    };

    // Find train index for hidden station counting
    let trainIdx = 0;
    for (let i = 0; i < normalizedStations.length; i++) {
        if (normalizedStations[i].percent / 100 >= trainProgress) {
            trainIdx = i;
            break;
        }
    }

    const corridorDots = buildCorridorDots();

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

            {/* Direction Indicator */}
            <div className="flex items-center justify-between text-[10px] text-cyan-600 tracking-widest">
                <span>{train.Direction === "SB" ? "← SOUTHBOUND" : "NORTHBOUND →"}</span>
                <span className="text-cyan-500">{Math.round(trainProgress * 100)}% progress</span>
            </div>

            {/* Horizontal corridor dots */}
            <div className="bg-black border border-cyan-500/20 p-3 space-y-2">
                <div className="text-cyan-400 text-lg font-mono flex items-center justify-center gap-1">
                    {corridorDots.map((dot, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                            <span className={dot.color}>
                                {dot.type === 'train'
                                    ? (train.Direction === "SB" ? "◀" : "▶")
                                    : dot.type === 'separator'
                                    ? (dot.isDotted ? "···" : "---")
                                    : "●"
                                }
                            </span>
                            {dot.type === 'separator' && dot.hiddenCount && (
                                <span className="text-cyan-600 text-[8px] whitespace-nowrap">+{dot.hiddenCount}</span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="text-[9px] space-y-0.5 border-t border-cyan-500/20 pt-2">
                    <div className="flex gap-2 flex-wrap justify-center">
                        {corridorDots.find(d => d.type === 'station' && d.color === 'text-gray-500') && (
                            <span><span className="text-gray-500">●</span> {corridorDots.find(d => d.type === 'station' && d.color === 'text-gray-500')?.label}</span>
                        )}
                        <span><span className={train.Direction === "SB" ? "text-red-400" : "text-green-400"}>
                            {train.Direction === "SB" ? "◀" : "▶"}
                        </span> Train</span>
                        <span><span className="text-blue-400">●</span> {origin}</span>
                        {passedDestination && <span><span className="text-orange-400">●</span> {passedDestination}</span>}
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
