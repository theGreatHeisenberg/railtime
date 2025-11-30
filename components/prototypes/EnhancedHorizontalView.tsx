"use client";

import { useEffect, useState, useRef } from "react";
import { Station, TrainPrediction, VehiclePosition } from "@/lib/types";
import { fetchVehiclePositions } from "@/lib/caltrain";
import { Train, MapPin, Navigation, X, ArrowRight, ArrowLeft, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/ThemeContext";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EnhancedHorizontalViewProps {
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

export default function EnhancedHorizontalView({
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
}: EnhancedHorizontalViewProps) {
    const { theme } = useTheme();
    const [hoveredStation, setHoveredStation] = useState<string | null>(null);

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

    const deg2rad = (deg: number) => deg * (Math.PI / 180);

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

        if (closestIdx < sortedStations.length - 1 && interpolationFactor === 0) {
            const currStation = sortedStations[closestIdx];
            const nextStation = sortedStations[closestIdx + 1];
            const distToCurr = getDistance(trainLat, trainLon, currStation.lat, currStation.lon);
            const distToNext = getDistance(trainLat, trainLon, nextStation.lat, nextStation.lon);
            const segmentLength = getDistance(currStation.lat, currStation.lon, nextStation.lat, nextStation.lon);

            if (distToCurr + distToNext <= segmentLength * 1.2) {
                segmentStartIdx = closestIdx;
                segmentEndIdx = closestIdx + 1;
                interpolationFactor = distToCurr / segmentLength;
            }
        }

        const startPercent = normalizedStations[segmentStartIdx].percent;
        const endPercent = normalizedStations[segmentEndIdx].percent;
        const interpolatedPercent = startPercent + (endPercent - startPercent) * interpolationFactor;

        return {
            percent: interpolatedPercent,
            stationIdx: closestIdx,
            isInterpolated: segmentStartIdx !== segmentEndIdx
        };
    };

    const trainData = getTrainPercent();
    const trainPercent = trainData?.percent ?? null;
    const trainStationIdx = trainData?.stationIdx ?? 0;

    const originStation = normalizedStations.find(s => s.stopname === origin);
    const originPercent = originStation?.percent || 0;
    const originIdx = normalizedStations.findIndex(s => s.stopname === origin);

    const MAX_VISIBLE_STATIONS = 12;

    type StationWithDisplay = typeof normalizedStations[0] & { displayPercent: number };
    let visibleStations: StationWithDisplay[] = [];

    const focusIdx = trainPercent !== null ? trainStationIdx : originIdx;

    if (originIdx !== -1) {
        const isSB = train.Direction === "SB";
        let idealStart = Math.min(focusIdx, originIdx) - 1;
        let idealEnd = Math.max(focusIdx, originIdx) + 1;

        idealStart = Math.max(0, idealStart);
        idealEnd = Math.min(normalizedStations.length - 1, idealEnd);

        const span = idealEnd - idealStart + 1;

        let startIdx = 0;
        let endIdx = normalizedStations.length - 1;

        if (span <= MAX_VISIBLE_STATIONS) {
            startIdx = idealStart;
            endIdx = idealEnd;
        } else {
            if (isSB) {
                startIdx = Math.max(0, focusIdx - 2);
                endIdx = Math.min(normalizedStations.length - 1, startIdx + MAX_VISIBLE_STATIONS - 1);
            } else {
                endIdx = Math.min(normalizedStations.length - 1, focusIdx + 2);
                startIdx = Math.max(0, endIdx - MAX_VISIBLE_STATIONS + 1);
            }
        }

        const slicedStations = normalizedStations.slice(startIdx, endIdx + 1);

        if (slicedStations.length > 0) {
            const minPercent = slicedStations[0].percent;
            const maxPercent = slicedStations[slicedStations.length - 1].percent;
            const range = maxPercent - minPercent;

            visibleStations = slicedStations.map(s => ({
                ...s,
                displayPercent: range > 0 ? ((s.percent - minPercent) / range) * 100 : 50
            }));
        }
    } else {
        visibleStations = normalizedStations.map(s => ({
            ...s,
            displayPercent: s.percent
        }));
    }


    const getTrainDisplayPercent = () => {
        if (trainPercent === null || visibleStations.length === 0) return null;
        const minPercent = visibleStations[0].percent;
        const maxPercent = visibleStations[visibleStations.length - 1].percent;
        const range = maxPercent - minPercent;
        return range > 0 ? ((trainPercent - minPercent) / range) * 100 : 50;
    };

    const trainDisplayPercent = getTrainDisplayPercent();

    // Get ETA from predictions
    const getRealTimeETA = (predictions: TrainPrediction[]): number => {
        const prediction = predictions.find(p => p.TrainNumber === train.TrainNumber);
        if (prediction) {
            const etaMinutes = parseInt(prediction.ETA.match(/\d+/) ? prediction.ETA.match(/\d+/)![0] : "0");
            return Math.max(0, etaMinutes);
        }
        return 0;
    };

    const etaToOriginMinutes = getRealTimeETA(originPredictions);

    // Determine destination
    const destination = passedDestination || (() => {
        const lastStopId = train.stopIds[train.stopIds.length - 1];
        const destStation = stations.find(s => s.stop1 === lastStopId || s.stop2 === lastStopId);
        return destStation?.stopname || null;
    })();

    // Check if train has reached origin
    const destStation = normalizedStations.find(s => s.stopname === destination);
    const trainReachedOrigin = originStation && trainPercent !== null && trainPercent >= (originStation.percent / 100);

    return (
        <div className={`${theme.colors.bg.card} overflow-hidden transition-all duration-500 rounded-lg border ${theme.colors.ui.border}`}>
            <CardHeader className="pb-4 relative z-10">
                <div className="mb-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <h3 className={`text-xl font-bold ${theme.colors.text.primary}`}>Corridor</h3>
                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                            train.Direction === "SB"
                                ? "bg-blue-500/30 text-blue-300"
                                : "bg-purple-500/30 text-purple-300"
                        }`}>
                            {train.Direction === "SB" ? "↓ South" : "↑ North"}
                        </span>
                    </div>
                    <p className={`text-sm ${theme.colors.text.muted} mt-1`}>
                        {trainReachedOrigin ? `Heading to ${destination}` : `Arriving at ${origin} in ${etaToOriginMinutes}m`}
                    </p>
                </div>
            </CardHeader>

            <CardContent className="p-6 relative bg-transparent">
                {/* Enhanced Horizontal Track */}
                <div className="relative w-full h-[280px] flex justify-center items-center z-10 px-16">
                    <div className="relative w-full h-24">
                        {/* Enhanced track background with gradient */}
                        <div className={`absolute top-1/2 left-0 w-full h-2 -translate-y-1/2 rounded-full ${theme.colors.track.background} overflow-hidden`}>
                            <div className="w-full h-full opacity-40"
                                style={{
                                    backgroundImage: "linear-gradient(to bottom, transparent 50%, rgba(0, 0, 0, 0.3) 50%)",
                                    backgroundSize: '20px 100%'
                                }}
                            />
                            {/* Animated shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 animate-pulse" />
                        </div>

                        {/* Enhanced filled track */}
                        {trainDisplayPercent !== null && (
                            <div
                                className={`absolute top-1/2 -translate-y-1/2 rounded-full ${theme.colors.track.fill}`}
                                style={{
                                    transition: 'left 2s cubic-bezier(0.25, 0.46, 0.45, 0.94), right 2s cubic-bezier(0.25, 0.46, 0.45, 0.94), width 2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                    left: train.Direction === "NB" ? '0%' : 'auto',
                                    right: train.Direction === "SB" ? '0%' : 'auto',
                                    width: train.Direction === "NB"
                                        ? `${100 - trainDisplayPercent}%`
                                        : `${trainDisplayPercent}%`,
                                    height: '10px'
                                }}
                            />
                        )}

                        {/* Enhanced Station Nodes */}
                        {visibleStations.map((s, i) => {
                            const isOrigin = s.stopname === origin;
                            const isPassed = trainDisplayPercent !== null && (
                                train.Direction === "NB"
                                    ? s.displayPercent > trainDisplayPercent
                                    : s.displayPercent < trainDisplayPercent
                            );

                            const stopIdToCheck = train.Direction === "NB" ? s.stop1 : s.stop2;
                            const isScheduledStop = train.stopIds.includes(stopIdToCheck);
                            const isNearTrain = trainDisplayPercent !== null && Math.abs(s.displayPercent - trainDisplayPercent) < 8;

                            const scheduledStopsBeforeThis = visibleStations
                                .slice(0, i)
                                .filter(st => {
                                    const stopId = train.Direction === "NB" ? st.stop1 : st.stop2;
                                    return train.stopIds.includes(stopId);
                                });
                            const isTopLabel = isScheduledStop ? scheduledStopsBeforeThis.length % 2 === 0 : i % 2 === 1;

                            const shouldHideNonScheduled = !isScheduledStop && !isOrigin && (() => {
                                const nearbyScheduled = visibleStations.some((other, otherIdx) => {
                                    if (otherIdx === i) return false;
                                    const otherStopId = train.Direction === "NB" ? other.stop1 : other.stop2;
                                    const isOtherScheduled = train.stopIds.includes(otherStopId);
                                    return isOtherScheduled && Math.abs(other.displayPercent - s.displayPercent) < 8;
                                });
                                return nearbyScheduled;
                            })();

                            return (
                                <div
                                    key={s.stopname}
                                    className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-500 group cursor-pointer"
                                    style={{ left: `${100 - s.displayPercent}%` }}
                                    onMouseEnter={() => setHoveredStation(s.stopname)}
                                    onMouseLeave={() => setHoveredStation(null)}
                                >
                                    {/* Station Label with enhanced styling */}
                                    <div
                                        className={`
                                            absolute whitespace-nowrap text-sm font-medium transition-all duration-300
                                            ${isOrigin ? `${theme.colors.text.accent}` : `${theme.colors.text.muted}`}
                                            ${isNearTrain && !isOrigin ? 'opacity-0' : 'opacity-100'}
                                            ${isTopLabel ? '-top-12' : 'top-10'}
                                            ${shouldHideNonScheduled ? 'opacity-0 scale-75' : !isScheduledStop && !isOrigin ? 'opacity-40 scale-75 group-hover:opacity-100 group-hover:scale-100' : ''}
                                            ${(isScheduledStop || isOrigin || hoveredStation === s.stopname) ? 'group-hover:scale-110 drop-shadow-lg' : ''}
                                        `}
                                    >
                                        {s.stopname}
                                        {isOrigin && (
                                            <div className={`absolute top-full mt-1 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap ${theme.colors.text.muted}`}>
                                                Departs {train.Departure}
                                            </div>
                                        )}

                                        {!isOrigin && (
                                            <div className={`
                                                absolute ${isTopLabel ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2
                                                px-3 py-1.5 rounded text-xs whitespace-nowrap
                                                opacity-0 group-hover:opacity-100 pointer-events-none
                                                transition-all duration-200 z-50 font-semibold
                                                ${theme.colors.bg.tertiary} ${theme.colors.text.secondary} border ${theme.colors.ui.border}
                                                backdrop-blur-sm
                                            `}>
                                                {isScheduledStop ? '🚂 Stop' : '⊘ Express'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Enhanced Station Dot with animations */}
                                    <div
                                        className={`
                                            rounded-full border-2 z-10 transition-all duration-300 relative
                                            ${isOrigin ? 'w-7 h-7' : isScheduledStop ? 'w-4 h-4' : 'w-2.5 h-2.5 opacity-60'}
                                            ${isNearTrain && !isOrigin ? 'animate-pulse scale-125' : ''}
                                            ${hoveredStation === s.stopname ? 'scale-150 z-20' : ''}
                                        `}
                                        style={{
                                            backgroundColor: isOrigin ? theme.colors.progress.origin : isPassed ? theme.colors.progress.current : theme.colors.progress.upcoming,
                                            borderColor: isOrigin ? theme.colors.progress.origin : isPassed ? theme.colors.progress.current : theme.colors.progress.upcoming,
                                            boxShadow: hoveredStation === s.stopname ? `0 0 20px ${theme.colors.glow}` : 'none'
                                        }}
                                    />

                                    {/* Connecting line to label */}
                                    {isScheduledStop && (
                                        <div
                                            className={`
                                                absolute w-0.5 h-5 transition-all duration-300
                                                ${isTopLabel ? '-top-5' : 'top-5'}
                                                ${hoveredStation === s.stopname ? 'h-6 opacity-100' : ''}
                                            `}
                                            style={{
                                                backgroundColor: isOrigin ? theme.colors.progress.origin : isPassed ? theme.colors.progress.current : theme.colors.progress.upcoming
                                            }}
                                        />
                                    )}
                                </div>
                            );
                        })}

                        {/* Enhanced Train Icon with improved glow */}
                        {trainDisplayPercent !== null && (
                            <div
                                className="absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center transition-all duration-1500"
                                style={{
                                    left: `${100 - trainDisplayPercent}%`,
                                }}
                            >
                                <div className="relative flex items-center justify-center">
                                    {/* Enhanced glow effect */}
                                    <div className="absolute -inset-3 rounded-full animate-pulse"
                                        style={{
                                            backgroundColor: `${theme.colors.track.accent}`,
                                            filter: 'blur(8px)',
                                            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                                        }}
                                    />

                                    {/* Direction Arrow - Left (SB) */}
                                    {train.Direction === "SB" && (
                                        <div className={`mr-2 animate-pulse transition-all duration-300 ${theme.colors.text.primary}`}>
                                            <ArrowLeft className="h-5 w-5" />
                                        </div>
                                    )}

                                    <div className="relative">
                                        <div className={`p-2 rounded-full transition-all duration-300 hover:scale-110`}
                                            style={{
                                                backgroundColor: `${theme.colors.progress.origin}20`,
                                                color: theme.colors.progress.origin,
                                                border: `2px solid ${theme.colors.progress.origin}`
                                            }}
                                        >
                                            <Train className="h-6 w-6" />
                                        </div>
                                        {/* Train number badge */}
                                        <div className={`
                                            absolute -top-1 -right-1 min-w-[1.5rem] h-6 px-1.5 rounded-full
                                            flex items-center justify-center text-[11px] font-bold
                                            border-2 shadow-lg transition-all duration-300
                                        `}
                                            style={{
                                                backgroundColor: theme.colors.progress.origin,
                                                color: 'white',
                                                borderColor: theme.colors.progress.origin
                                            }}
                                        >
                                            {train.TrainNumber}
                                        </div>
                                        {/* Delay status badge */}
                                        {train.delayStatus && (
                                            <div className={`
                                                absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap
                                                px-2 py-0.5 rounded text-[9px] font-bold border transition-all duration-300
                                                ${train.delayStatus === "on-time" ? "bg-green-900/80 text-green-300 border-green-600" : ""}
                                                ${train.delayStatus === "early" ? "bg-blue-900/80 text-blue-300 border-blue-600" : ""}
                                                ${train.delayStatus === "delayed" ? "bg-red-900/80 text-red-300 border-red-600" : ""}
                                            `}>
                                                {train.delayStatus === "on-time" && "ON TIME"}
                                                {train.delayStatus === "early" && `${Math.abs(train.delayMinutes!)}m EARLY`}
                                                {train.delayStatus === "delayed" && `${train.delayMinutes}m LATE`}
                                            </div>
                                        )}
                                    </div>

                                    {/* Direction Arrow - Right (NB) */}
                                    {train.Direction === "NB" && (
                                        <div className={`ml-2 animate-pulse transition-all duration-300 ${theme.colors.text.primary}`}>
                                            <ArrowRight className="h-5 w-5" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {trainDisplayPercent === null && (
                            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-full border text-sm flex items-center gap-2 shadow-lg bg-slate-900/90 border-red-500/50 text-red-400`}>
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                Live tracking unavailable
                            </div>
                        )}
                    </div>

                    {/* Direction Labels */}
                    <div className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs uppercase tracking-wider font-bold ${theme.colors.text.muted}`}>
                        North →
                    </div>
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-xs uppercase tracking-wider font-bold ${theme.colors.text.muted}`}>
                        ← South
                    </div>
                </div>
            </CardContent>

            {/* Footer Info */}
            <div className={`p-4 grid grid-cols-2 gap-4 text-center text-sm ${theme.colors.bg.secondary} ${theme.colors.ui.divider} border-t`}>
                <div>
                    <div className={`${theme.colors.text.muted} mb-1`}>Distance to {origin}</div>
                    <div className={`font-mono text-lg ${theme.colors.text.secondary}`}>
                        {originStation && vehiclePosition ?
                            (getDistance(
                                vehiclePosition.Vehicle.Position.Latitude,
                                vehiclePosition.Vehicle.Position.Longitude,
                                originStation.lat,
                                originStation.lon
                            ) * 0.621371).toFixed(1)
                            : '--'} <span className="text-xs text-slate-500">mi</span>
                    </div>
                </div>
                <div>
                    <div className={`${theme.colors.text.muted} mb-1`}>Next Stop</div>
                    <div className={`font-medium truncate px-2 ${theme.colors.text.secondary}`}>
                        {(() => {
                            if (trainPercent === null) return "--";
                            const candidates = normalizedStations.filter((s) => {
                                const isAhead = train.Direction === "NB"
                                    ? s.percent < trainPercent
                                    : s.percent > trainPercent;
                                if (!isAhead) return false;
                                const stopIdToCheck = train.Direction === "NB" ? s.stop1 : s.stop2;
                                return train.stopIds.includes(stopIdToCheck);
                            });
                            if (candidates.length === 0) return "Terminus";
                            candidates.sort((a, b) => {
                                const distA = Math.abs(a.percent - trainPercent);
                                const distB = Math.abs(b.percent - trainPercent);
                                return distA - distB;
                            });
                            return candidates.length > 0 ? candidates[0].stopname : "End of Line";
                        })()}
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
            `}</style>
        </div>
    );
}
