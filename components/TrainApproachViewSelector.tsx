"use client";

import { useState } from "react";
import { TrainPrediction, Station } from "@/lib/types";
import TerminalCorridorView from "./TerminalCorridorView";
import TerminalTimelineView from "./TerminalTimelineView";

interface TrainApproachViewSelectorProps {
    train: TrainPrediction;
    origin: string;
    stations: Station[];
    onClose: () => void;
    destination?: string;
    vehiclePositions?: any[];
    currentTime?: Date;
    originPredictions?: TrainPrediction[];
    destinationPredictions?: TrainPrediction[];
    loading?: boolean;
    stationETAMap?: Record<string, { etaMinutes: number; arrivalTime: string }>;
}

type ViewType = 'horizontal' | 'progress';

export default function TrainApproachViewSelector({
    train,
    origin,
    stations,
    onClose,
    destination,
    vehiclePositions = [],
    currentTime = new Date(),
    originPredictions = [],
    destinationPredictions = [],
    loading = false,
    stationETAMap,
}: TrainApproachViewSelectorProps) {
    const [viewType, setViewType] = useState<ViewType>('progress');

    return (
        <div className="relative">
            {/* View Selector Buttons - Terminal Style */}
            <div className="absolute top-4 right-4 z-50 flex gap-2 bg-black border-2 border-cyan-400 p-2" style={{boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)'}}>
                <button
                    onClick={() => setViewType('horizontal')}
                    className={`px-3 py-1 font-mono text-xs tracking-widest transition-colors border ${
                        viewType === 'horizontal'
                            ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300'
                            : 'border-green-500/50 bg-green-950/20 text-green-400 hover:bg-green-950/40'
                    }`}
                    title="Corridor - Horizontal track view"
                >
                    [CORRIDOR]
                </button>
                <button
                    onClick={() => setViewType('progress')}
                    className={`px-3 py-1 font-mono text-xs tracking-widest transition-colors border ${
                        viewType === 'progress'
                            ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300'
                            : 'border-green-500/50 bg-green-950/20 text-green-400 hover:bg-green-950/40'
                    }`}
                    title="Timeline - Vertical progress view"
                >
                    [TIMELINE]
                </button>
            </div>

            {/* Render Selected View */}
            {viewType === 'horizontal' ? (
                <TerminalCorridorView
                    train={train}
                    origin={origin}
                    stations={stations}
                    destination={destination}
                    vehiclePositions={vehiclePositions}
                    currentTime={currentTime}
                    originPredictions={originPredictions}
                    destinationPredictions={destinationPredictions}
                    loading={loading}
                    stationETAMap={stationETAMap}
                />
            ) : (
                <TerminalTimelineView
                    train={train}
                    origin={origin}
                    stations={stations}
                    destination={destination}
                    vehiclePositions={vehiclePositions}
                    currentTime={currentTime}
                    originPredictions={originPredictions}
                    destinationPredictions={destinationPredictions}
                    loading={loading}
                    stationETAMap={stationETAMap}
                />
            )}
        </div>
    );
}
