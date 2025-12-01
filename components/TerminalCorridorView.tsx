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
    destinationPredictions: passedDestinationPredictions = [],
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

    // Get departure times for origin and destination
    const originPrediction = passedOriginPredictions.find(p => p.TrainNumber === train.TrainNumber);
    const destinationPrediction = passedDestinationPredictions.find(p => p.TrainNumber === train.TrainNumber);

    // Build simple corridor with only key elements
    const buildCorridorDots = () => {
        const dots: Array<{ type: 'station' | 'train' | 'separator'; color: string; label?: string; hiddenCount?: number; isDotted?: boolean; departureTime?: string; scheduledTime?: string }> = [];
        const isSB = train.Direction === "SB";

        // Find nearest upcoming station (closest to train but after it)
        let nearestUpcomingIdx = -1;
        let closestDistToUpcoming = Infinity;

        for (let i = 0; i < normalizedStations.length; i++) {
            const stationProgress = normalizedStations[i].percent / 100;
            const isUpcoming = isSB
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

        // Helper function to add separator with hidden count
        const addSeparator = (hiddenCount?: number, isDotted?: boolean) => {
            dots.push({
                type: 'separator',
                color: 'text-cyan-600',
                hiddenCount: hiddenCount,
                isDotted: isDotted
            });
        };

        // Build elements: Train -> Next Station -> Origin -> Destination
        // If origin is the next station, skip showing next station separately

        // Add train
        dots.push({ type: 'train', color: 'text-green-400' });

        // Add next station (if it exists and is not the origin)
        if (nearestUpcomingIdx !== -1 && nearestUpcomingIdx !== originIdx) {
            let hiddenToNext = 0;
            const minIdx = Math.min(trainIdx, nearestUpcomingIdx);
            const maxIdx = Math.max(trainIdx, nearestUpcomingIdx);
            for (let i = minIdx + 1; i < maxIdx; i++) {
                hiddenToNext++;
            }
            addSeparator(hiddenToNext > 0 ? hiddenToNext : undefined, true);

            const station = normalizedStations[nearestUpcomingIdx];
            dots.push({ type: 'station', color: 'text-gray-500', label: station.stopname });
        }

        // Add origin (if it exists)
        if (originIdx !== -1) {
            // Calculate hidden stations between train/next and origin
            let hiddenToOrigin = 0;
            const startIdx = nearestUpcomingIdx !== -1 && nearestUpcomingIdx !== originIdx 
                ? nearestUpcomingIdx 
                : trainIdx;
            const minIdx = Math.min(startIdx, originIdx);
            const maxIdx = Math.max(startIdx, originIdx);
            for (let i = minIdx + 1; i < maxIdx; i++) {
                hiddenToOrigin++;
            }
            const isDottedSeparator = originIdx === nearestUpcomingIdx;
            addSeparator(hiddenToOrigin > 0 ? hiddenToOrigin : undefined, isDottedSeparator);

            const station = normalizedStations[originIdx];
            dots.push({ 
                type: 'station', 
                color: 'text-blue-400', 
                label: station.stopname,
                departureTime: originPrediction?.Departure,
                scheduledTime: originPrediction?.ScheduledTime
            });
        }

        // Add destination if it exists
        if (destIdx !== -1) {
            let hiddenToDest = 0;
            const startIdx = originIdx !== -1 ? originIdx : (nearestUpcomingIdx !== -1 ? nearestUpcomingIdx : trainIdx);
            const minIdx = Math.min(startIdx, destIdx);
            const maxIdx = Math.max(startIdx, destIdx);
            for (let i = minIdx + 1; i < maxIdx; i++) {
                hiddenToDest++;
            }
            const isDottedSeparator = destIdx === nearestUpcomingIdx;
            addSeparator(hiddenToDest > 0 ? hiddenToDest : undefined, isDottedSeparator);
            const station = normalizedStations[destIdx];
            dots.push({ 
                type: 'station', 
                color: 'text-orange-400', 
                label: station.stopname,
                departureTime: destinationPrediction?.Departure,
                scheduledTime: destinationPrediction?.ScheduledTime
            });
        }

        // For SB, reverse the order so train moves left (←)
        // NB: Train (→) -> Next Station -> Origin -> Destination
        // SB: Destination -> Origin -> Next Station -> Train (←)
        if (isSB) {
            return dots.reverse();
        } else {
            return dots;
        }
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
            <div className="bg-black border border-cyan-500/20 p-3">
                <div className="text-cyan-400 text-lg font-mono flex items-start justify-center gap-2">
                    {corridorDots.map((dot, idx) => (
                        <div key={idx} className={`flex flex-col items-center justify-start ${dot.type === 'separator' ? 'min-w-[20px]' : 'min-w-[60px]'}`}>
                            <span className={`${dot.color} leading-none`}>
                                {dot.type === 'train'
                                    ? (train.Direction === "SB" ? "◀" : "▶")
                                    : dot.type === 'separator'
                                    ? (dot.isDotted ? "···" : "---")
                                    : "●"
                                }
                            </span>
                            <div className="flex flex-col items-center justify-start mt-1 min-h-[2rem]">
                                {dot.type === 'separator' && dot.hiddenCount && (
                                    <span className="text-cyan-600 text-[8px] whitespace-nowrap leading-none">+{dot.hiddenCount}</span>
                                )}
                                {dot.type === 'station' && dot.label && (
                                    <>
                                        <span className={`${dot.color} text-[9px] text-center leading-tight max-w-[80px] truncate`} title={dot.label}>
                                            {dot.label}
                                        </span>
                                        {(dot.departureTime || dot.scheduledTime) && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                                {dot.scheduledTime && dot.departureTime && dot.scheduledTime !== dot.departureTime && (
                                                    <span className="line-through text-gray-500 text-[7px]">{dot.scheduledTime}</span>
                                                )}
                                                <span className={`${dot.color} text-[7px] leading-none`}>
                                                    {dot.departureTime || dot.scheduledTime}
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}
                                {dot.type === 'train' && (
                                    <span className="text-[9px] text-cyan-500 leading-tight">Train</span>
                                )}
                            </div>
                        </div>
                    ))}
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
