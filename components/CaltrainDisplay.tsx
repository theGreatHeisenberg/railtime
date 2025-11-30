"use client";

import { useEffect, useState } from "react";
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
import SettingsModal from "./SettingsModal";
import TrainApproachViewSelector from "./TrainApproachViewSelector";
import BrutalTrainSummary from "./BrutalTrainSummary";
import ThemeSwitcher from "./ThemeSwitcher";
import { fetchVehiclePositions } from "@/lib/caltrain";
import { useTheme } from "@/lib/ThemeContext";
import { calculateStationETAs, getTrainETAFromPredictions } from "@/lib/etaCalculations";

export default function CaltrainDisplay() {
    const { theme } = useTheme();
    const [stations, setStations] = useState<Station[]>([]);
    const [origin, setOrigin] = useState<string>("");
    const [destination, setDestination] = useState<string>("");
    const [predictions, setPredictions] = useState<TrainPrediction[]>([]);
    const [destinationPredictions, setDestinationPredictions] = useState<TrainPrediction[]>([]);
    const [vehiclePositions, setVehiclePositions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [selectedTrain, setSelectedTrain] = useState<TrainPrediction | null>(null);
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [stationETAMap, setStationETAMap] = useState<Record<string, { etaMinutes: number; arrivalTime: string }>>({});

    useEffect(() => {
        fetchStations().then((data) => {
            setStations(data);

            // Load defaults from localStorage or use hardcoded defaults
            const savedOrigin = localStorage.getItem("defaultOrigin");
            const savedDest = localStorage.getItem("defaultDestination");

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
            } else if (findStation("Palo Alto")) {
                setDestination("Palo Alto");
            }
        });
    }, []);

    // Unified data fetch - fetches everything every 10 seconds
    const loadAllData = async () => {
        if (!origin || stations.length === 0) return;

        setLoading(true);
        const now = new Date();

        try {
            // Fetch origin predictions
            const originStation = stations.find((s) => s.stopname === origin);
            if (originStation) {
                const originPreds = await fetchPredictions(originStation);
                setPredictions(originPreds);
            }

            // Fetch destination predictions
            if (destination && destination !== "All") {
                const destStation = stations.find((s) => s.stopname === destination);
                if (destStation) {
                    const destPreds = await fetchPredictions(destStation);
                    setDestinationPredictions(destPreds);
                }
            } else {
                setDestinationPredictions([]);
            }

            // Fetch vehicle positions
            const positions = await fetchVehiclePositions();
            setVehiclePositions(positions);

            // Update time in sync with data fetch
            setCurrentTime(now);
            setLastUpdated(now);
        } catch (error) {
            console.error("Error fetching data:", error);
        }

        setLoading(false);
    };

    // Initial load and set up unified 10-second refresh interval
    useEffect(() => {
        loadAllData();
        const interval = setInterval(loadAllData, 10000); // Refresh every 10 seconds
        return () => clearInterval(interval);
    }, [origin, destination, stations]);

    // Determine journey direction if destination is selected
    let journeyDirection: "NB" | "SB" | null = null;
    if (destination && destination !== "All") {
        const originStation = stations.find((s) => s.stopname === origin);
        const destStation = stations.find((s) => s.stopname === destination);

        if (originStation && destStation) {
            const originId = parseInt(originStation.stop1);
            const destId = parseInt(destStation.stop1);
            journeyDirection = originId < destId ? "SB" : "NB";
        }
    }

    const filteredPredictions = predictions.filter((p) => {
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

    const nbPredictions = filteredPredictions.filter((p) => p.Direction === "NB");
    const sbPredictions = filteredPredictions.filter((p) => p.Direction === "SB");

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
    }, [selectedTrain, origin, destination, stations, predictions, destinationPredictions, currentTime]);

    // Get the next train (first in filtered list)
    const nextTrain = filteredPredictions[0];

    // Helper to get ETA for a specific train to destination
    const getTrainETA = (train: TrainPrediction, preds: TrainPrediction[]): number => {
        return getTrainETAFromPredictions(train, preds);
    };

    const [stationSelectorOpen, setStationSelectorOpen] = useState(false);

    return (
        <div className={`min-h-screen ${theme.colors.bg.primary} transition-colors duration-500`}>
            <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8">
                {/* BRUTALIST HEADER */}
                <div className="space-y-6">
                    <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-dashed ${theme.colors.ui.border}">
                        <h1 className={`font-mono text-2xl tracking-tight ${theme.colors.text.primary}`}>
                            railtime
                        </h1>
                        <div className="flex items-center gap-4">
                            <div className={`font-mono text-xs ${theme.colors.text.muted}`}>
                                {lastUpdated && lastUpdated.toLocaleTimeString()}
                            </div>
                            <ThemeSwitcher />
                        </div>
                    </div>

                    {/* STATION SELECTION - Inline and minimal */}
                    <div className="space-y-3">
                        <div
                            className={`flex items-center gap-3 cursor-pointer pb-2 border-b ${theme.colors.ui.divider}`}
                            onClick={() => setStationSelectorOpen(!stationSelectorOpen)}
                        >
                            <span className={`font-mono text-lg ${theme.colors.text.primary}`}>
                                {origin} <span className={theme.colors.text.muted}>→</span> {destination === "All" ? "all" : destination}
                            </span>
                            <span className={`text-xs font-mono ${theme.colors.text.muted} ml-auto`}>
                                [{stationSelectorOpen ? "−" : "+"}]
                            </span>
                        </div>

                        {stationSelectorOpen && (
                            <div className="pt-2 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className={`font-mono text-xs ${theme.colors.text.accent}`}>origin</label>
                                        <Select value={origin} onValueChange={setOrigin}>
                                            <SelectTrigger className={`${theme.colors.bg.tertiary} border ${theme.colors.ui.border} ${theme.colors.text.primary} font-mono text-sm`}>
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent className={`${theme.colors.bg.tertiary} border ${theme.colors.ui.border} ${theme.colors.text.primary}`}>
                                                {stations.map((s) => (
                                                    <SelectItem key={s.stopname} value={s.stopname}>
                                                        {s.stopname}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className={`font-mono text-xs ${theme.colors.text.accent}`}>destination</label>
                                        <Select value={destination} onValueChange={setDestination}>
                                            <SelectTrigger className={`${theme.colors.bg.tertiary} border ${theme.colors.ui.border} ${theme.colors.text.primary} font-mono text-sm`}>
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent className={`${theme.colors.bg.tertiary} border ${theme.colors.ui.border} ${theme.colors.text.primary}`}>
                                                <SelectItem value="All">All</SelectItem>
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

                                    <div className="flex items-end">
                                        <Button
                                            onClick={loadAllData}
                                            variant="outline"
                                            className={`${theme.colors.bg.tertiary} border ${theme.colors.ui.border} ${theme.colors.text.primary} w-full font-mono text-sm h-9`}
                                        >
                                            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
                                            refresh
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* NEXT TRAIN - Minimal text block */}
                {nextTrain && (
                    <div className={`py-6 px-0 border-t border-b ${theme.colors.ui.divider} space-y-2`}>
                        <div className={`font-mono text-xs ${theme.colors.text.muted}`}>
                            next departure from {origin}
                        </div>
                        <div className="flex items-baseline gap-4 flex-wrap">
                            <span className={`font-mono text-3xl ${theme.colors.text.primary}`}>
                                #{nextTrain.TrainNumber}
                            </span>
                            <span className={`font-mono text-sm ${theme.colors.text.accent}`}>
                                {nextTrain.TrainType.toLowerCase()}
                            </span>
                            <span className={`font-mono text-xl ${theme.colors.text.primary}`}>
                                {nextTrain.Departure}
                            </span>
                            <span className={`font-mono text-lg font-bold text-yellow-500 animate-pulse`}>
                                {nextTrain.ETA}
                            </span>
                            {nextTrain.delayStatus && (
                                <span className={`font-mono text-xs ${
                                    nextTrain.delayStatus === "on-time" ? "text-green-400" :
                                    nextTrain.delayStatus === "delayed" ? "text-red-400" : "text-blue-400"
                                }`}>
                                    {nextTrain.delayStatus === "on-time" ? "on-time" :
                                     nextTrain.delayStatus === "delayed" ? `${nextTrain.delayMinutes}m late` :
                                     `${Math.abs(nextTrain.delayMinutes!)}m early`}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Tabular View - Minimal predictions */}
                {(!journeyDirection || (journeyDirection === "NB" && nbPredictions.length > 0) || (journeyDirection === "SB" && sbPredictions.length > 0) || (!journeyDirection && (nbPredictions.length > 0 || sbPredictions.length > 0))) && (
                    <div className="space-y-6">
                        {journeyDirection ? (
                            // Single direction view
                            <div className="space-y-4">
                                <div className={`font-mono text-sm font-bold tracking-wide ${theme.colors.text.primary}`}>
                                    {journeyDirection === "NB" ? "northbound" : "southbound"}
                                </div>
                                <BrutalPredictionTable
                                    predictions={journeyDirection === "NB" ? nbPredictions : sbPredictions}
                                    loading={loading}
                                    onSelectTrain={setSelectedTrain}
                                    selectedTrainId={selectedTrain?.TrainNumber}
                                    theme={theme}
                                />
                            </div>
                        ) : (
                            // Both directions - side by side
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className={`font-mono text-sm font-bold tracking-wide ${theme.colors.text.primary}`}>
                                        northbound ({nbPredictions.length})
                                    </div>
                                    <BrutalPredictionTable
                                        predictions={nbPredictions}
                                        loading={loading}
                                        onSelectTrain={setSelectedTrain}
                                        selectedTrainId={selectedTrain?.TrainNumber}
                                        theme={theme}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div className={`font-mono text-sm font-bold tracking-wide ${theme.colors.text.primary}`}>
                                        southbound ({sbPredictions.length})
                                    </div>
                                    <BrutalPredictionTable
                                        predictions={sbPredictions}
                                        loading={loading}
                                        onSelectTrain={setSelectedTrain}
                                        selectedTrainId={selectedTrain?.TrainNumber}
                                        theme={theme}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Train Approach View - Brutalist Wrapped */}
                {selectedTrain && (
                    <div className="animate-in slide-in-from-top-10 fade-in duration-500 space-y-3">
                        <div className={`font-mono text-sm font-bold tracking-wide ${theme.colors.text.primary}`}>
                            approach visualization
                        </div>
                        <div className={`border-l-4 border-dashed ${theme.colors.ui.border} pl-4 py-4`}>
                            <TrainApproachViewSelector
                                train={selectedTrain}
                                origin={origin}
                                stations={stations}
                                destination={destination !== "All" ? destination : undefined}
                                onClose={() => setSelectedTrain(filteredPredictions[0] || null)}
                                vehiclePositions={vehiclePositions}
                                currentTime={currentTime}
                                originPredictions={predictions}
                                destinationPredictions={destinationPredictions}
                                loading={loading}
                                stationETAMap={stationETAMap}
                            />
                        </div>
                    </div>
                )}

                {/* Train Summary - Brutalist Wrapped */}
                {selectedTrain && (
                    <div className="animate-in slide-in-from-top-10 fade-in duration-500 space-y-3">
                        <div className={`font-mono text-sm font-bold tracking-wide ${theme.colors.text.primary}`}>
                            journey summary
                        </div>
                        <div className={`border-t border-b ${theme.colors.ui.divider} py-4`}>
                            <BrutalTrainSummary
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
                                currentTime={currentTime}
                            />
                        </div>
                    </div>
                )}

                {/* Minimal footer */}
                <div className={`pt-8 border-t ${theme.colors.ui.divider} text-center space-y-2`}>
                    <a
                        href="https://github.com/theGreatHeisenberg/railtime"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-block font-mono text-xs ${theme.colors.text.accent} hover:${theme.colors.text.primary} transition-colors`}
                    >
                        github.com/theGreatHeisenberg/railtime
                    </a>
                    <p className={`font-mono text-xs ${theme.colors.text.muted}`}>
                        real-time caltrain tracker
                    </p>
                </div>
            </div>
        </div>
    );
}

interface BrutalPredictionTableProps {
    predictions: TrainPrediction[];
    loading: boolean;
    onSelectTrain: (train: TrainPrediction) => void;
    selectedTrainId?: string;
    theme: any;
}

function BrutalPredictionTable({
    predictions,
    loading,
    onSelectTrain,
    selectedTrainId,
    theme,
}: BrutalPredictionTableProps) {
    if (loading) {
        return (
            <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className={`h-6 w-full ${theme.colors.bg.tertiary}`} />
                ))}
            </div>
        );
    }

    if (predictions.length === 0) {
        return (
            <div className={`font-mono text-sm ${theme.colors.text.muted}`}>
                no trains scheduled
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {predictions.slice(0, 10).map((p) => (
                <div
                    key={p.TrainNumber}
                    onClick={() => onSelectTrain(p)}
                    className={`flex items-center justify-between py-1.5 px-2 cursor-pointer border-l-2 transition-colors ${
                        selectedTrainId === p.TrainNumber
                            ? `border-l-yellow-500 ${theme.colors.bg.secondary}`
                            : `border-l-transparent ${theme.colors.ui.hover}`
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className={`font-mono font-bold text-base ${theme.colors.text.primary} w-16`}>
                            #{p.TrainNumber}
                        </span>
                        <span className={`font-mono text-xs ${theme.colors.text.accent} w-12`}>
                            {p.TrainType.toLowerCase().substring(0, 3)}
                        </span>
                        <span className={`font-mono text-sm ${theme.colors.text.primary} w-16`}>
                            {p.Departure}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                        <span className={`font-mono text-sm font-bold text-yellow-500 animate-pulse-slow w-12 text-right`}>
                            {p.ETA}
                        </span>
                        {p.delayStatus && (
                            <span className={`font-mono text-xs ${
                                p.delayStatus === "on-time" ? "text-green-400" :
                                p.delayStatus === "delayed" ? "text-red-400" : "text-blue-400"
                            } w-12 text-right`}>
                                {p.delayStatus === "on-time" ? "on" :
                                 p.delayStatus === "delayed" ? `+${p.delayMinutes}m` :
                                 `−${Math.abs(p.delayMinutes!)}m`}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
