"use client";

import { useRef, useEffect, useState } from "react";
import { Station, TrainPrediction } from "@/lib/types";

interface TerminalTimelineViewProps {
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

export default function TerminalTimelineView({
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
}: TerminalTimelineViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [expandedBefore, setExpandedBefore] = useState(false);
    const [expandedAfter, setExpandedAfter] = useState(false);

    const vehiclePosition = vehiclePositions.find(p => p.Vehicle?.Trip?.TripId === train.TrainNumber) || null;
    const currentTime = passedCurrentTime || new Date();
    const originPredictions = passedOriginPredictions || [];
    const destinationPredictions = passedDestinationPredictions || [];

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

        return (normalizedStations[closestIdx].percent / 100);
    };

    const trainProgress = getTrainPercent() ?? 0;

    const getRealTimeETA = (predictions: TrainPrediction[]): number => {
        const prediction = predictions.find(p => p.TrainNumber === train.TrainNumber);
        if (prediction) {
            const etaMinutes = parseInt(prediction.ETA.match(/\d+/) ? prediction.ETA.match(/\d+/)![0] : "0");
            return Math.max(0, etaMinutes);
        }
        return parseInt(train.ETA.match(/\d+/) ? train.ETA.match(/\d+/)![0] : "0");
    };

    const etaToOriginMinutes = getRealTimeETA(originPredictions);

    const originStation = normalizedStations.find(s => s.stopname === origin);
    const destinationStation = normalizedStations.find(s => s.stopname === passedDestination);

    const originIdx = normalizedStations.findIndex(s => s.stopname === origin);
    const destIdx = passedDestination ? normalizedStations.findIndex(s => s.stopname === passedDestination) : -1;

    // Smart visible stations
    const getVisibleStations = () => {
        if (originIdx === -1) return normalizedStations;

        let visibleIndices = new Set<number>();
        visibleIndices.add(originIdx);

        for (let i = Math.max(0, originIdx - 2); i < originIdx; i++) {
            visibleIndices.add(i);
        }

        for (let i = originIdx + 1; i <= Math.min(normalizedStations.length - 1, originIdx + 2); i++) {
            visibleIndices.add(i);
        }

        if (destIdx !== -1) {
            visibleIndices.add(destIdx);
        }

        return Array.from(visibleIndices)
            .sort((a, b) => a - b)
            .map(idx => normalizedStations[idx]);
    };

    const getHiddenBefore = () => {
        if (originIdx <= 2) return [];
        return normalizedStations.slice(0, originIdx - 2);
    };

    const getHiddenAfter = () => {
        if (originIdx === -1 || destIdx === -1 || destIdx <= originIdx + 2) return [];
        return normalizedStations.slice(originIdx + 3, destIdx);
    };

    const visibleStations = expandedBefore || expandedAfter ? normalizedStations : getVisibleStations();
    const hiddenBefore = getHiddenBefore();
    const hiddenAfter = getHiddenAfter();

    const getIsPassed = (stationPercent: number): boolean => {
        if (train.Direction === "SB") {
            return (stationPercent / 100) <= trainProgress;
        } else {
            return (stationPercent / 100) >= trainProgress;
        }
    };

    const getStationETA = (stationName: string): { relativeMinutes: number; arrivalTime: string } => {
        if (stationETAMap && stationETAMap[stationName]) {
            const eta = stationETAMap[stationName];
            return {
                relativeMinutes: eta.etaMinutes,
                arrivalTime: eta.arrivalTime
            };
        }
        if (loading) {
            return { relativeMinutes: -1, arrivalTime: "LOADING" };
        }
        return { relativeMinutes: 0, arrivalTime: "--:--" };
    };

    // ASCII progress bar builder
    const getProgressBar = (percent: number): string => {
        const barWidth = 20;
        const filled = Math.round((percent / 100) * barWidth);
        const empty = barWidth - filled;
        return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
    };

    return (
        <div className="w-full bg-black text-cyan-300 font-mono text-xs space-y-1 p-4 rounded-lg border border-cyan-500/30 max-h-[400px] overflow-y-auto" ref={containerRef}>
            {/* Header */}
            <div className="text-cyan-400 font-bold tracking-widest border-b border-cyan-500/30 pb-2 sticky top-0 bg-black">
                ╔═══ TIMELINE ═══╗
            </div>

            {/* Train Status Line */}
            <div className="text-green-400 py-1 border-b border-green-500/20">
                Train #{train.TrainNumber} {train.Direction === "SB" ? "↓ SOUTH" : "↑ NORTH"} | ETA: {etaToOriginMinutes}m
            </div>

            {/* Expand Before Button */}
            {hiddenBefore.length > 0 && !expandedBefore && (
                <button
                    onClick={() => setExpandedBefore(true)}
                    className="w-full text-cyan-500 hover:text-cyan-300 text-[11px] py-1 border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-950/40 transition-colors"
                >
                    ▲ SHOW {hiddenBefore.length} EARLIER STATIONS
                </button>
            )}

            {/* Stations */}
            <div className="space-y-0.5">
                {visibleStations.map((station, idx) => {
                    const isPassed = getIsPassed(station.percent);
                    const isOrigin = station.stopname === origin;
                    const isDestination = station.stopname === passedDestination;
                    const eta = getStationETA(station.stopname);
                    const etaStr = eta.relativeMinutes >= 0 ? eta.arrivalTime : "PASSED";

                    const statusIcon = isPassed
                        ? isOrigin
                            ? "◀"
                            : "▲"
                        : isOrigin
                        ? "●"
                        : isDestination
                        ? "◆"
                        : "○";

                    const colorClass = isPassed
                        ? "text-green-600"
                        : isOrigin
                        ? "text-yellow-400"
                        : "text-cyan-400";

                    return (
                        <div key={station.stopname} className={`flex items-center justify-between py-0.5 px-1 border-l-2 ${
                            isOrigin ? "border-l-yellow-400 bg-yellow-950/20" :
                            isDestination ? "border-l-pink-400 bg-pink-950/20" :
                            isPassed ? "border-l-green-500 bg-green-950/10" :
                            "border-l-cyan-500/30"
                        }`}>
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                                <span className={colorClass}>{statusIcon}</span>
                                <span className="truncate flex-1">{station.stopname}</span>
                            </div>
                            <span className={`text-[10px] ml-2 ${
                                eta.relativeMinutes < 0 ? "text-green-500" : "text-pink-400"
                            }`}>
                                {etaStr}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Expand After Button */}
            {hiddenAfter.length > 0 && !expandedAfter && (
                <button
                    onClick={() => setExpandedAfter(true)}
                    className="w-full text-cyan-500 hover:text-cyan-300 text-[11px] py-1 border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-950/40 transition-colors"
                >
                    ▼ SHOW {hiddenAfter.length} LATER STATIONS
                </button>
            )}

            {/* Overall Progress */}
            <div className="border-t border-cyan-500/30 pt-1 mt-2">
                <div className="text-cyan-500 text-[10px] mb-1">
                    OVERALL_PROGRESS {Math.round(trainProgress * 100)}%
                </div>
                <div className="text-cyan-400 text-[11px]">
                    {getProgressBar(trainProgress * 100)}
                </div>
            </div>
        </div>
    );
}
