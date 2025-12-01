"use client";

import { useEffect, useState, memo, useMemo, useRef } from "react";
import { Station, TrainPrediction } from "@/lib/types";
import { fetchStations, fetchPredictions } from "@/lib/caltrain";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Train } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import dynamic from "next/dynamic";

import TrainApproachViewSelector from "./TrainApproachViewSelector";
import TrainSummary from "./TrainSummary";
import HolidayLights from "./HolidayLights";
import TerminalThemeSwitcher from "./TerminalThemeSwitcher";
import { fetchVehiclePositions } from "@/lib/caltrain";
import { useTheme } from "@/lib/ThemeContext";
import { calculateStationETAs, getTrainETAFromPredictions } from "@/lib/etaCalculations";

export default function CaltrainDisplay() {
    const { theme } = useTheme();
    const [stations, setStations] = useState<Station[]>([]);
    const [origin, setOrigin] = useState<string>("");
    const [destination, setDestination] = useState<string>("");
    const [predictions, setPredictions] = useState<TrainPrediction[]>([]);
    const predictionsRef = useRef<TrainPrediction[]>([]);
    const [destinationPredictions, setDestinationPredictions] = useState<TrainPrediction[]>([]);
    const destinationPredictionsRef = useRef<TrainPrediction[]>([]);
    const [vehiclePositions, setVehiclePositions] = useState<any[]>([]);
    const vehiclePositionsRef = useRef<any[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showLoadingSpinners, setShowLoadingSpinners] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [selectedTrain, setSelectedTrain] = useState<TrainPrediction | null>(null);
    const [stationETAMap, setStationETAMap] = useState<Record<string, { etaMinutes: number; arrivalTime: string }>>({});
    const [lastPassedTrainId, setLastPassedTrainId] = useState<string | null>(null);
    const [etaCalculationTime, setEtaCalculationTime] = useState<Date>(new Date());

    useEffect(() => {
        fetchStations().then((data) => {
            setStations(data);

            // Load defaults from localStorage
            const savedOrigin = localStorage.getItem("selectedOrigin");
            const savedDest = localStorage.getItem("selectedDestination");

            const findStation = (name: string) => data.find(s => s.stopname === name);

            // Set Origin
            if (savedOrigin && findStation(savedOrigin)) {
                setOrigin(savedOrigin);
            } else if (findStation("Sunnyvale")) {
                setOrigin("Sunnyvale");
            } else if (data.length > 0) {
                setOrigin(data[0].stopname);
            }

            // Set Destination
            if (savedDest && (savedDest === "All" || findStation(savedDest))) {
                setDestination(savedDest);
            } else {
                setDestination("All");
            }
        });
    }, []);

    // Persist selections
    useEffect(() => {
        if (origin) localStorage.setItem("selectedOrigin", origin);
    }, [origin]);

    useEffect(() => {
        if (destination) localStorage.setItem("selectedDestination", destination);
    }, [destination]);

    /**
     * Compare two prediction arrays for meaningful changes.
     * Returns true if arrays are functionally different (should update state).
     * Only compares fields that would affect visible UI rendering.
     */
    const predictionsChanged = (prev: TrainPrediction[], next: TrainPrediction[]): boolean => {
        if (prev.length !== next.length) return true;

        for (let i = 0; i < prev.length; i++) {
            const p = prev[i];
            const n = next[i];

            // Compare train identity and key display properties
            if (
                p.TrainNumber !== n.TrainNumber ||
                p.Direction !== n.Direction ||
                p.TrainType !== n.TrainType ||
                p.ETA !== n.ETA ||
                p.Departure !== n.Departure ||
                p.delayStatus !== n.delayStatus ||
                p.delayMinutes !== n.delayMinutes
            ) {
                return true;
            }
        }
        return false;
    };

    // Unified data fetch - fetches everything every 10 seconds
    const loadAllData = async () => {
        if (!origin || stations.length === 0) return;

        // Show updating spinner during API calls (visible in corner, never blocks table)
        setIsUpdating(true);
        const now = new Date();

        try {
            // Fetch origin predictions
            const originStation = stations.find((s) => s.stopname === origin);
            if (originStation) {
                const originPreds = await fetchPredictions(originStation);

                // Only update state if predictions meaningfully changed
                if (predictionsChanged(predictionsRef.current, originPreds)) {
                    predictionsRef.current = originPreds;
                    setPredictions(originPreds);
                }

                // Track recently passed trains
                // If a train was previously selected and now doesn't appear in predictions,
                // it likely has passed or been filtered out
                if (selectedTrain && !originPreds.find(p => p.TrainNumber === selectedTrain.TrainNumber)) {
                    // Check if this train should be stored as the last passed train
                    const savedLastPassed = localStorage.getItem(`lastPassedTrain_${origin}`);
                    const savedTime = localStorage.getItem(`lastPassedTime_${origin}`);
                    const now_ms = new Date().getTime();
                    const savedTime_ms = savedTime ? parseInt(savedTime) : 0;

                    // Update if this is more recent (within last 2 minutes)
                    if (now_ms - savedTime_ms > 120000 || !savedLastPassed) {
                        localStorage.setItem(`lastPassedTrain_${origin}`, selectedTrain.TrainNumber);
                        localStorage.setItem(`lastPassedTime_${origin}`, now_ms.toString());
                        setLastPassedTrainId(selectedTrain.TrainNumber);
                    }
                }
            }

            // Fetch destination predictions
            if (destination && destination !== "All") {
                const destStation = stations.find((s) => s.stopname === destination);
                if (destStation) {
                    const destPreds = await fetchPredictions(destStation);
                    // Only update state if destination predictions meaningfully changed
                    if (predictionsChanged(destinationPredictionsRef.current, destPreds)) {
                        destinationPredictionsRef.current = destPreds;
                        setDestinationPredictions(destPreds);
                    }
                }
            } else {
                // Clear if no destination selected
                if (destinationPredictionsRef.current.length > 0) {
                    destinationPredictionsRef.current = [];
                    setDestinationPredictions([]);
                }
            }

            // Fetch vehicle positions and only update if data meaningfully changed
            const positions = await fetchVehiclePositions();

            // Check if positions actually changed to prevent unnecessary re-renders
            const positionsChanged =
                vehiclePositionsRef.current.length !== positions.length ||
                vehiclePositionsRef.current.some((prevPos, idx) => {
                    const nextPos = positions[idx];
                    if (!nextPos) return true;
                    // Compare only the fields that matter for rendering
                    const prevVehicle = prevPos.Vehicle;
                    const nextVehicle = nextPos.Vehicle;
                    return (
                        prevVehicle.Trip.TripId !== nextVehicle.Trip.TripId ||
                        prevVehicle.Position.Latitude !== nextVehicle.Position.Latitude ||
                        prevVehicle.Position.Longitude !== nextVehicle.Position.Longitude ||
                        (prevVehicle.Position.Bearing !== nextVehicle.Position.Bearing)
                    );
                });

            // Only update state if positions meaningfully changed
            if (positionsChanged) {
                vehiclePositionsRef.current = positions;
                setVehiclePositions(positions);
            }

            // Update last updated timestamp
            setLastUpdated(now);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            // Always clear updating state when done
            setIsUpdating(false);
        }
    };

    // Show loading spinners briefly after API responds for visual feedback
    useEffect(() => {
        if (lastUpdated) {
            setShowLoadingSpinners(true);
            // Show spinners for ~1 second after API responds
            const timer = setTimeout(() => setShowLoadingSpinners(false), 1000);
            return () => clearTimeout(timer);
        }
    }, [lastUpdated]);

    // Load last passed train from localStorage on mount
    useEffect(() => {
        const savedTrainId = localStorage.getItem(`lastPassedTrain_${origin}`);
        const savedTime = localStorage.getItem(`lastPassedTime_${origin}`);

        if (savedTrainId && savedTime) {
            const savedTime_ms = parseInt(savedTime);
            const now_ms = new Date().getTime();
            // Keep the passed train visible for 5 minutes
            if (now_ms - savedTime_ms < 300000) {
                setLastPassedTrainId(savedTrainId);
            } else {
                // Clear if older than 5 minutes
                localStorage.removeItem(`lastPassedTrain_${origin}`);
                localStorage.removeItem(`lastPassedTime_${origin}`);
                setLastPassedTrainId(null);
            }
        }
    }, [origin]);

    // Initial load and set up unified 10-second refresh interval
    useEffect(() => {
        loadAllData();
        const interval = setInterval(loadAllData, 10000); // Refresh every 10 seconds
        return () => clearInterval(interval);
    }, [origin, destination, stations]);

    // Determine journey direction if destination is selected
    const journeyDirection = useMemo(() => {
        let direction: "NB" | "SB" | null = null;
        if (destination && destination !== "All") {
            const originStation = stations.find((s) => s.stopname === origin);
            const destStation = stations.find((s) => s.stopname === destination);

            if (originStation && destStation) {
                const originId = parseInt(originStation.stop1);
                const destId = parseInt(destStation.stop1);
                direction = originId < destId ? "SB" : "NB";
            }
        }
        return direction;
    }, [destination, origin, stations]);

    const filteredPredictions = useMemo(() => {
        return predictions.filter((p) => {
            if (!destination || destination === "All") return true;

            const originStation = stations.find((s) => s.stopname === origin);
            const destStation = stations.find((s) => s.stopname === destination);

            if (!originStation || !destStation) return true;

            // 1. Direction Check
            if (journeyDirection && p.Direction !== journeyDirection) return false;

            // 2. Reachability Check - DISABLED
            // The station-specific predictions API often only returns the prediction for the requested station,
            // not the full list of future stops. This causes the reachability check to fail for all trains.
            // We will rely on Direction filtering for now.

            return true;
        });
    }, [predictions, destination, origin, stations, journeyDirection]);

    const { nbPredictions, sbPredictions } = useMemo(() => {
        return {
            nbPredictions: filteredPredictions.filter((p) => p.Direction === "NB"),
            sbPredictions: filteredPredictions.filter((p) => p.Direction === "SB")
        };
    }, [filteredPredictions]);

    // Get recently passed train from state (tracked via localStorage)
    const recentlyPassedTrain = useMemo(() => {
        return lastPassedTrainId
            ? {
                TrainNumber: lastPassedTrainId,
                Direction: "NB", // Will be overridden by display logic
                ETA: "PASSED",
                Departure: "--:--",
                TrainType: "",
                delayStatus: "on-time",
                delayMinutes: 0
            } as TrainPrediction
            : null;
    }, [lastPassedTrainId]);

    // Add recently passed train to display if it exists and not already in filtered list
    const displayNBPredictions = useMemo(() => {
        return recentlyPassedTrain && !nbPredictions.find(p => p.TrainNumber === recentlyPassedTrain.TrainNumber)
            ? [recentlyPassedTrain, ...nbPredictions]
            : nbPredictions;
    }, [recentlyPassedTrain, nbPredictions]);

    const displaySBPredictions = useMemo(() => {
        return recentlyPassedTrain && !sbPredictions.find(p => p.TrainNumber === recentlyPassedTrain.TrainNumber)
            ? [recentlyPassedTrain, ...sbPredictions]
            : sbPredictions;
    }, [recentlyPassedTrain, sbPredictions]);

    // Auto-select the first train when predictions update
    useEffect(() => {
        if (filteredPredictions.length > 0 && !selectedTrain) {
            setSelectedTrain(filteredPredictions[0]);
        }
        // If selected train is no longer in the list, select the first one
        if (selectedTrain && !filteredPredictions.find(p => p.TrainNumber === selectedTrain.TrainNumber)) {
            setSelectedTrain(filteredPredictions[0] || null);
        }
    }, [filteredPredictions]);

    // Calculate station ETAs whenever data changes
    useEffect(() => {
        if (selectedTrain && origin && stations.length > 0 && predictions.length > 0) {
            const currentTime = new Date();
            setEtaCalculationTime(currentTime);
            const etaMap = calculateStationETAs(
                selectedTrain,
                origin,
                destination !== "All" ? destination : undefined,
                stations,
                predictions,
                destinationPredictions,
                currentTime
            );
            // Convert Map to Record for React state
            const etaRecord: Record<string, { etaMinutes: number; arrivalTime: string }> = {};
            etaMap.forEach((value, key) => {
                etaRecord[key] = value;
            });
            setStationETAMap(etaRecord);
        }
    }, [selectedTrain, origin, destination, stations, predictions, destinationPredictions]);

    // Get the next train (first in filtered list)
    const nextTrain = filteredPredictions[0];

    // Helper to get ETA for a specific train to destination
    const getTrainETA = (train: TrainPrediction, preds: TrainPrediction[]): number => {
        return getTrainETAFromPredictions(train, preds);
    };

    const [stationSelectorOpen, setStationSelectorOpen] = useState(false);

    return (
        <div className={`min-h-screen ${theme.colors.bg.primary} ${theme.typography.fontFamily} transition-colors duration-500`}>
            <HolidayLights />
            <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-6">
                {/* TERMINAL HEADER WITH NEON GLOW */}
                <div className="space-y-4">
                    <div className={`border-l-4 ${theme.colors.ui.border.replace('border', 'border-l')} pl-4 py-2 ${theme.colors.bg.card}`}>
                        <div className={`text-3xl font-bold ${theme.colors.text.primary} animate-pulse`} style={{ textShadow: `0 0 10px ${theme.colors.glow.replace('drop-shadow-[0_0_10px_', '').replace(']', '')}` }}>
                            {theme.logo.icon} {theme.typography.logoText} {theme.logo.icon}
                        </div>
                        <div className={`text-xs ${theme.colors.text.secondary} mt-1 tracking-widest`}>
                            real-time caltrain monitoring system v1.0
                        </div>
                    </div>

                    <div className={`flex items-center justify-between text-xs px-2`}>
                        <span className={`${theme.colors.status.onTime}`}>[SYSTEM ACTIVE]</span>
                        <span className={`${theme.colors.text.secondary}`}>
                            {lastUpdated && `LAST UPDATE: ${lastUpdated.toLocaleTimeString()}`}
                        </span>
                        <div className="flex gap-2 items-center">
                            {/* Updating spinner - spins during API calls, doesn't block layout */}
                            {isUpdating && (
                                <div className="animate-spin inline-block">
                                    <div className={`${theme.colors.status.onTime}`}>⟳</div>
                                </div>
                            )}
                            <TerminalThemeSwitcher />
                        </div>
                    </div>

                    <div className={`border ${theme.colors.ui.divider} border-dashed`}></div>
                </div>

                {/* ROUTE CONFIG AND INCOMING TRAIN ALERT - Two Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ROUTE CONFIG PANEL */}
                    <div className="space-y-2">
                        <div className={`${theme.colors.text.primary} text-xs font-bold tracking-widest`}>
                            ╔═══ ROUTE CONFIGURATION ═══╗
                        </div>
                        <div className={`border-l-2 ${theme.colors.ui.border.replace('border', 'border-l')} pl-3 py-2 ${theme.colors.bg.card}`}>
                            <div
                                className={`group flex items-center justify-between cursor-pointer ${theme.colors.ui.hover} px-2 py-2 transition-all border border-transparent hover:${theme.colors.ui.border.replace('border-', 'border-')}`}
                                onClick={() => setStationSelectorOpen(!stationSelectorOpen)}
                            >
                                <div className="flex flex-col">
                                    <span className={`${theme.colors.text.accent} font-bold group-hover:${theme.colors.text.primary} transition-colors flex items-center gap-2`}>
                                        <span className="text-xs">►</span>
                                        {origin}
                                        <span className={`${theme.colors.text.muted}`}>→</span>
                                        {destination && destination !== "All" ? destination : "All Stations"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`${theme.colors.text.muted} text-[10px] group-hover:${theme.colors.text.secondary} transition-colors tracking-widest font-bold opacity-70 group-hover:opacity-100`}>
                                        [EDIT_ROUTE]
                                    </span>
                                    <span className={`${theme.colors.status.onTime} text-xs`}>
                                        {stationSelectorOpen ? "▼" : "▶"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {stationSelectorOpen && (
                            <div className={`space-y-2 mt-2 p-3 ${theme.colors.bg.primary} border ${theme.colors.ui.border}`}>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-1">
                                        <label className={`${theme.colors.status.onTime} text-xs tracking-widest`}>ORIGIN_STATION</label>
                                        <Select value={origin} onValueChange={setOrigin}>
                                            <SelectTrigger className={`${theme.colors.bg.primary} border ${theme.colors.ui.border} ${theme.colors.text.primary} font-mono text-xs h-8`}>
                                                <SelectValue placeholder=">" />
                                            </SelectTrigger>
                                            <SelectContent className={`${theme.colors.bg.primary} border ${theme.colors.ui.border} ${theme.colors.text.primary}`}>
                                                {stations.map((s) => (
                                                    <SelectItem key={s.stopname} value={s.stopname}>
                                                        {s.stopname}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className={`${theme.colors.status.onTime} text-xs tracking-widest`}>DESTINATION</label>
                                        <Select value={destination} onValueChange={setDestination}>
                                            <SelectTrigger className={`${theme.colors.bg.primary} border ${theme.colors.ui.border} ${theme.colors.text.primary} font-mono text-xs h-8`}>
                                                <SelectValue placeholder=">" />
                                            </SelectTrigger>
                                            <SelectContent className={`${theme.colors.bg.primary} border ${theme.colors.ui.border} ${theme.colors.text.primary}`}>
                                                <SelectItem value="All">[ all ]</SelectItem>
                                                {stations
                                                    .filter((s) => s.stopname !== origin)
                                                    .map((s) => (
                                                        <SelectItem key={s.stopname} value={s.stopname}>
                                                            {s.stopname}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Button
                                    onClick={loadAllData}
                                    className={`${theme.colors.bg.primary} border ${theme.colors.status.onTime.replace('text-', 'border-')} ${theme.colors.status.onTime} hover:${theme.colors.ui.hover} h-7 text-xs font-mono w-full`}
                                >
                                    {isUpdating ? "█ UPDATING..." : "▶ REFRESH"}
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* NEXT TRAIN ALERT */}
                    {nextTrain && (
                        <div className="space-y-2">
                            <div className={`${theme.colors.status.onTime} text-xs font-bold tracking-widest flex items-center justify-between`}>
                                <span>╔═══ INCOMING TRAIN ═══╗</span>
                                <SectionSpinner isLoading={showLoadingSpinners} />
                            </div>
                            <div className={`border-2 ${theme.colors.status.onTime.replace('text-', 'border-')} p-2 ${theme.colors.bg.card}`} style={{ boxShadow: `0 0 20px ${theme.colors.glow.replace('drop-shadow-[0_0_10px_', '').replace(']', '')}` }}>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`${theme.colors.status.onTime} text-[10px] uppercase tracking-wider whitespace-nowrap`}>Train</span>
                                        <span className={`${theme.colors.text.accent} text-sm font-bold`}>#{nextTrain.TrainNumber}</span>
                                        <span className={`${theme.colors.text.secondary} text-xs`}>({nextTrain.TrainType})</span>
                                        {nextTrain.delayStatus && (
                                            <span className={`text-[10px] font-bold ${nextTrain.delayStatus === "on-time" ? theme.colors.status.onTime :
                                                nextTrain.delayStatus === "delayed" ? theme.colors.status.delayed : theme.colors.status.early
                                                }`}>
                                                {nextTrain.delayStatus === "on-time" ? "[OK]" :
                                                    nextTrain.delayStatus === "delayed" ? `[+${nextTrain.delayMinutes}m]` :
                                                        `[−${Math.abs(nextTrain.delayMinutes!)}m]`}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`${theme.colors.status.onTime} text-[10px] uppercase tracking-wider whitespace-nowrap`}>Departure</span>
                                        <div className="flex items-center gap-1">
                                            {nextTrain.ScheduledTime && nextTrain.ScheduledTime !== nextTrain.Departure && (
                                                <span className={`line-through ${theme.colors.text.muted} text-xs`}>{nextTrain.ScheduledTime}</span>
                                            )}
                                            <span className={`${theme.colors.text.accent} text-sm`}>{nextTrain.Departure}</span>
                                        </div>
                                        <span className={`${theme.colors.status.delayed} text-sm font-bold animate-pulse`} style={{ textShadow: '0 0 10px rgba(244, 63, 94, 0.8)' }}>
                                            (in {nextTrain.ETA})
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className={`border ${theme.colors.ui.divider} border-dashed`}></div>


                {/* PREDICTIONS PANEL - Train Predictions with Terminal Styling */}
                {(!journeyDirection || (journeyDirection === "NB" && displayNBPredictions.length > 0) || (journeyDirection === "SB" && displaySBPredictions.length > 0) || (!journeyDirection && (displayNBPredictions.length > 0 || displaySBPredictions.length > 0))) && (
                    <div className="space-y-3">
                        {journeyDirection ? (
                            <>
                                <div className={`${theme.colors.status.onTime} text-xs font-bold tracking-widest flex items-center justify-between`}>
                                    <span>╔═══ {journeyDirection === "NB" ? "NORTHBOUND" : "SOUTHBOUND"} QUEUE ═══╗</span>
                                    <SectionSpinner isLoading={showLoadingSpinners} />
                                </div>
                                <TerminalPredictionTable
                                    predictions={journeyDirection === "NB" ? displayNBPredictions : displaySBPredictions}
                                    onSelectTrain={setSelectedTrain}
                                    selectedTrainId={selectedTrain?.TrainNumber}
                                    recentlyPassedTrainId={recentlyPassedTrain?.TrainNumber}
                                />
                            </>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div className={`${theme.colors.status.onTime} text-xs font-bold tracking-widest flex items-center justify-between`}>
                                        <span>╔═══ NORTHBOUND QUEUE ═══╗</span>
                                        <SectionSpinner isLoading={showLoadingSpinners} />
                                    </div>
                                    <TerminalPredictionTable
                                        predictions={displayNBPredictions}
                                        onSelectTrain={setSelectedTrain}
                                        selectedTrainId={selectedTrain?.TrainNumber}
                                        recentlyPassedTrainId={recentlyPassedTrain?.TrainNumber}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <div className={`${theme.colors.status.delayed} text-xs font-bold tracking-widest flex items-center justify-between`}>
                                        <span>╔═══ SOUTHBOUND QUEUE ═══╗</span>
                                        <SectionSpinner isLoading={showLoadingSpinners} />
                                    </div>
                                    <TerminalPredictionTable
                                        predictions={displaySBPredictions}
                                        onSelectTrain={setSelectedTrain}
                                        selectedTrainId={selectedTrain?.TrainNumber}
                                        recentlyPassedTrainId={recentlyPassedTrain?.TrainNumber}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Train Approach View - Terminal Wrapped */}
                {selectedTrain && (
                    <div className="animate-in slide-in-from-top-10 fade-in duration-500 space-y-3">
                        <div className={`${theme.colors.text.primary} text-xs font-bold tracking-widest flex items-center justify-between`}>
                            <span>╔═══ APPROACH VISUALIZATION ═══╗</span>
                            <SectionSpinner isLoading={showLoadingSpinners} />
                        </div>
                        <div className={`border ${theme.colors.ui.border} p-4 ${theme.colors.bg.primary}`}>
                            <TrainApproachViewSelector
                                train={selectedTrain}
                                origin={origin}
                                stations={stations}
                                destination={destination !== "All" ? destination : undefined}
                                onClose={() => setSelectedTrain(filteredPredictions[0] || null)}
                                vehiclePositions={vehiclePositions}
                                currentTime={new Date()}
                                originPredictions={predictions}
                                destinationPredictions={destinationPredictions}
                                stationETAMap={stationETAMap}
                            />
                        </div>
                    </div>
                )}

                {/* Train Summary - Terminal Wrapped */}
                {selectedTrain && (
                    <div className="animate-in slide-in-from-top-10 fade-in duration-500 space-y-3">
                        <div className={`${theme.colors.text.accent} text-xs font-bold tracking-widest flex items-center justify-between`}>
                            <span>╔═══ JOURNEY DETAILS ═══╗</span>
                            <SectionSpinner isLoading={showLoadingSpinners} />
                        </div>
                        <div className={`border ${theme.colors.ui.border} p-4 ${theme.colors.bg.primary}`}>
                            <TrainSummary
                                train={selectedTrain}
                                origin={origin}
                                destination={destination !== "All" ? destination : undefined}
                                etaToOriginMinutes={getTrainETA(selectedTrain, predictions)}
                                etaToDestinationMinutes={
                                    destination && destination !== "All"
                                        ? getTrainETA(selectedTrain, destinationPredictions)
                                        : 0
                                }
                                trainReachedOrigin={false}
                                stations={stations}
                                originPredictions={predictions}
                                destinationPredictions={destination !== "All" ? destinationPredictions : []}
                            />
                        </div>
                    </div>
                )}

                {/* TERMINAL FOOTER */}
                <div className={`border-t ${theme.colors.ui.divider} pt-4 text-center space-y-1`}>
                    <a
                        href="https://github.com/theGreatHeisenberg/railtime"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${theme.colors.text.secondary} text-xs hover:${theme.colors.text.accent} transition-colors font-mono tracking-widest`}
                    >
                        {`> github.com/theGreatHeisenberg/railtime`}
                    </a>
                    <p className={`${theme.colors.status.onTime} text-xs font-mono`}>
                        [OPEN_SOURCE] [REAL-TIME] [MONITORING]
                    </p>
                </div>
            </div>
        </div>
    );
}

/**
 * Section loading spinner component
 * Shows a spinning indicator on the right side of section titles
 * Spins for ~1 second after API response to provide visual feedback
 */
const SectionSpinner = ({ isLoading }: { isLoading: boolean }) => {
    if (!isLoading) return null;
    const { theme } = useTheme();
    return (
        <div className={`animate-spin ${theme.colors.status.onTime}`}>
            ◈
        </div>
    );
};

interface TerminalPredictionTableProps {
    predictions: TrainPrediction[];
    onSelectTrain: (train: TrainPrediction) => void;
    selectedTrainId?: string;
    recentlyPassedTrainId?: string;
}

const TerminalPredictionTable = memo(function TerminalPredictionTable({
    predictions,
    onSelectTrain,
    selectedTrainId,
    recentlyPassedTrainId,
}: TerminalPredictionTableProps) {
    const { theme } = useTheme();

    if (predictions.length === 0) {
        return (
            <div className={`${theme.colors.status.onTime} text-xs font-mono p-2`}>
                [NO TRAINS IN QUEUE]
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {predictions.slice(0, 10).map((p, idx) => {
                const isPassed = recentlyPassedTrainId === p.TrainNumber;
                return (
                    <div
                        key={`${p.TrainNumber}-${p.Direction}`}
                        onClick={() => onSelectTrain(p)}
                        className={`flex items-center justify-between py-1.5 px-2 cursor-pointer font-mono text-xs transition-colors border-l-2 ${selectedTrainId === p.TrainNumber
                            ? `border-l-${theme.colors.text.primary.split('-')[1]}-400 ${theme.colors.ui.active} ${theme.colors.text.primary}`
                            : isPassed
                                ? `border-l-green-600 bg-green-950/30 ${theme.colors.status.onTime} opacity-80`
                                : `border-l-transparent ${theme.colors.ui.hover} ${theme.colors.text.secondary}`
                            }`}
                    >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Radio button indicator */}
                            <span className={`flex-shrink-0 w-4 text-center ${selectedTrainId === p.TrainNumber
                                ? theme.colors.text.primary
                                : `${theme.colors.text.muted} opacity-50`
                                }`}>
                                {selectedTrainId === p.TrainNumber ? "●" : "○"}
                            </span>
                            <span className={`${theme.colors.text.accent} font-bold w-16`}>#{p.TrainNumber}</span>
                            <span className={`w-10 ${isPassed ? theme.colors.status.onTime : theme.colors.text.accent}`}>
                                {isPassed ? "PAST" : p.TrainType.substring(0, 3).toUpperCase()}
                            </span>
                            <span className={`w-16 ${isPassed ? theme.colors.status.onTime : theme.colors.text.primary}`}>
                                <div className="flex items-center gap-1">
                                    {p.ScheduledTime && p.ScheduledTime !== p.Departure && (
                                        <span className={`line-through ${theme.colors.text.muted} text-[10px]`}>{p.ScheduledTime}</span>
                                    )}
                                    <span>{p.Departure}</span>
                                </div>
                            </span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                            <span className={`font-bold w-12 text-right ${isPassed ? theme.colors.status.onTime :
                                p.delayStatus === "delayed" ? theme.colors.status.delayed :
                                    p.delayStatus === "early" ? theme.colors.status.early : theme.colors.status.onTime
                                }`}>
                                {p.ETA}
                            </span>
                            {p.delayStatus && (
                                <span className={`${theme.colors.status.onTime} text-[10px] w-8 text-right`}>
                                    {p.delayStatus === "on-time" ? "[OK]" :
                                        p.delayStatus === "delayed" ? `[+${p.delayMinutes}]` :
                                            `[−${Math.abs(p.delayMinutes!)}]`}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
});
