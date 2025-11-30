"use client";

import { useState } from "react";
import { TrainPrediction, Station } from "@/lib/types";
import EnhancedHorizontalView from "./prototypes/EnhancedHorizontalView";
import AnimatedProgressView from "./prototypes/AnimatedProgressView";
import { Button } from "@/components/ui/button";
import { LayoutList, LayoutTemplate } from "lucide-react";

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
            {/* View Selector Buttons - Top Right */}
            <div className="absolute top-4 right-4 z-50 flex gap-1 bg-slate-900/90 backdrop-blur-sm p-1.5 rounded-lg border border-slate-700">
                <Button
                    variant={viewType === 'horizontal' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewType('horizontal')}
                    className="p-1.5 h-auto w-auto"
                    title="Corridor - Horizontal track view"
                >
                    <LayoutTemplate className="h-5 w-5" />
                </Button>
                <Button
                    variant={viewType === 'progress' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewType('progress')}
                    className="p-1.5 h-auto w-auto"
                    title="Timeline - Vertical progress view"
                >
                    <LayoutList className="h-5 w-5" />
                </Button>
            </div>

            {/* Render Selected View */}
            {viewType === 'horizontal' ? (
                <EnhancedHorizontalView
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
                <AnimatedProgressView
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
