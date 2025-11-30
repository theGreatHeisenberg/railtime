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

    // Build ASCII corridor visualization
    const corridorWidth = 60;
    const railLine = Array(corridorWidth).fill('─');

    // Place stations
    visibleStations.forEach((station, idx) => {
        const minPercent = visibleStations[0].percent;
        const maxPercent = visibleStations[visibleStations.length - 1].percent;
        const range = maxPercent - minPercent || 100;
        const displayPercent = range > 0 ? ((station.percent - minPercent) / range) * 100 : 50;
        const pos = Math.round((displayPercent / 100) * (corridorWidth - 1));

        if (pos >= 0 && pos < corridorWidth) {
            railLine[pos] = station.stopname === origin ? '●' : '○';
        }
    });

    // Place train
    if (trainPercent !== null) {
        const minPercent = visibleStations[0].percent;
        const maxPercent = visibleStations[visibleStations.length - 1].percent;
        const range = maxPercent - minPercent || 100;
        const displayPercent = range > 0 ? ((trainPercent - minPercent) / range) * 100 : 50;
        const pos = Math.round((displayPercent / 100) * (corridorWidth - 1));

        if (pos >= 0 && pos < corridorWidth) {
            railLine[pos] = '▶';
        }
    }

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
                    Train #{train.TrainNumber} {train.Direction === "SB" ? "↓ SOUTH" : "↑ NORTH"}
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

            {/* ASCII Corridor */}
            <div className="bg-black border border-cyan-500/20 p-3 space-y-2">
                <div className="text-cyan-500 tracking-widest text-xs">
                    {railLine.join('')}
                </div>

                {/* Station Labels */}
                <div className="text-[10px] text-cyan-400 space-y-1">
                    {visibleStations.slice(0, 5).map((s) => (
                        <div key={s.stopname} className="truncate">
                            {s.stopname === origin ? `● ${s.stopname}` : `○ ${s.stopname}`}
                        </div>
                    ))}
                    {visibleStations.length > 5 && (
                        <div className="text-cyan-600 text-[9px]">
                            ... +{visibleStations.length - 5} more stations
                        </div>
                    )}
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
                    Progress: {trainPercent ? Math.round(trainPercent) : '?'}% | Type: {train.TrainType}
                </div>
            </div>
        </div>
    );
}
