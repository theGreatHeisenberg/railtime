"use client";

import { useState } from "react";
import { TrainPrediction, Station } from "@/lib/types";
import TerminalCorridorView from "./TerminalCorridorView";
import TerminalTimelineView from "./TerminalTimelineView";

import { useTheme } from "@/lib/ThemeContext";

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
    stationETAMap,
}: TrainApproachViewSelectorProps) {
    const [viewType, setViewType] = useState<ViewType>('progress');
    const { theme } = useTheme();

    return (
        <div className="relative">
            {/* View Selector Buttons - Terminal Style */}
            <div className={`absolute top-4 right-4 z-50 flex gap-2 ${theme.colors.bg.primary} border-2 ${theme.colors.ui.border} p-2`} style={{ boxShadow: `0 0 20px ${theme.colors.glow.replace('drop-shadow-[0_0_10px_', '').replace(']', '')}` }}>
                <button
                    onClick={() => setViewType('horizontal')}
                    className={`px-3 py-1 ${theme.typography.fontFamily} text-xs tracking-widest transition-colors border ${viewType === 'horizontal'
                        ? `${theme.colors.ui.border} ${theme.colors.ui.active} ${theme.colors.text.primary}`
                        : `${theme.colors.status.onTime.replace('text-', 'border-')} ${theme.colors.status.onTime.replace('text-', 'bg-').replace('400', '950')}/20 ${theme.colors.status.onTime} hover:${theme.colors.status.onTime.replace('text-', 'bg-').replace('400', '950')}/40`
                        }`}
                    title="Corridor - Horizontal track view"
                >
                    [CORRIDOR]
                </button>
                <button
                    onClick={() => setViewType('progress')}
                    className={`px-3 py-1 ${theme.typography.fontFamily} text-xs tracking-widest transition-colors border ${viewType === 'progress'
                        ? `${theme.colors.ui.border} ${theme.colors.ui.active} ${theme.colors.text.primary}`
                        : `${theme.colors.status.onTime.replace('text-', 'border-')} ${theme.colors.status.onTime.replace('text-', 'bg-').replace('400', '950')}/20 ${theme.colors.status.onTime} hover:${theme.colors.status.onTime.replace('text-', 'bg-').replace('400', '950')}/40`
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
                    stationETAMap={stationETAMap}
                />
            )}
        </div>
    );
}
