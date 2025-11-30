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
import dynamic from "next/dynamic";
import SettingsModal from "./SettingsModal";
import TrainApproachViewSelector from "./TrainApproachViewSelector";
import TrainSummary from "./TrainSummary";
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
            <div className="max-w-6xl mx-auto p-4 space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <h1 className={`text-3xl font-bold flex items-center gap-2 ${theme.colors.text.primary}`}>
                        <Train className="h-8 w-8" /> TrackTrain
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className={`text-sm ${theme.colors.text.muted}`}>
                            {lastUpdated && `Updated: ${lastUpdated.toLocaleTimeString()}`}
                        </div>
                        <ThemeSwitcher />
                        <SettingsModal stations={stations} />
                    </div>
                </div>

                {/* STATION SELECTION - Collapsible at top */}
                <Card className={`${theme.colors.bg.card} ${theme.colors.text.primary} border ${theme.colors.ui.border}`}>
                    <CardHeader
                        className={`cursor-pointer ${theme.colors.ui.hover} transition-colors py-3`}
                        onClick={() => setStationSelectorOpen(!stationSelectorOpen)}
                    >
                        <CardTitle className="text-lg flex items-center justify-between">
                            <span>
                                {origin} {destination && destination !== "All" && `→ ${destination}`}
                            </span>
                            <Button variant="ghost" size="sm" className="h-8">
                                {stationSelectorOpen ? "Hide" : "Change"}
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    {stationSelectorOpen && (
                        <CardContent className="flex flex-col md:flex-row gap-4 pt-0">
                            <div className="flex-1 space-y-2">
                                <label className={`text-sm font-medium ${theme.colors.text.accent}`}>Origin</label>
                                <Select value={origin} onValueChange={setOrigin}>
                                    <SelectTrigger className={`${theme.colors.bg.tertiary} border ${theme.colors.ui.border} ${theme.colors.text.primary}`}>
                                        <SelectValue placeholder="Select Origin" />
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

                            <div className="flex-1 space-y-2">
                                <label className={`text-sm font-medium ${theme.colors.text.accent}`}>
                                    Destination (Optional)
                                </label>
                                <Select value={destination} onValueChange={setDestination}>
                                    <SelectTrigger className={`${theme.colors.bg.tertiary} border ${theme.colors.ui.border} ${theme.colors.text.primary}`}>
                                        <SelectValue placeholder="Select Destination" />
                                    </SelectTrigger>
                                    <SelectContent className={`${theme.colors.bg.tertiary} border ${theme.colors.ui.border} ${theme.colors.text.primary}`}>
                                        <SelectItem value="All">All Destinations</SelectItem>
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
                                    className={`${theme.colors.bg.tertiary} border ${theme.colors.ui.border} ${theme.colors.text.primary} w-full md:w-auto`}
                                >
                                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                                    Refresh
                                </Button>
                            </div>
                        </CardContent>
                    )}
                </Card>

                {/* NEXT TRAIN BANNER - Compact and stylish */}
                {nextTrain && (
                    <Card className={`bg-gradient-to-r ${theme.gradients.main} border ${theme.colors.ui.border} ${theme.colors.shadow}`}>
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                                    <Train className="h-6 w-6 text-yellow-500" />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400 uppercase tracking-wider">Next Train from {origin}</div>
                                    <div className="text-2xl font-bold text-yellow-500 flex items-center gap-2">
                                        #{nextTrain.TrainNumber}
                                        <Badge variant="outline" className="text-xs font-normal text-slate-300 border-slate-600">
                                            {nextTrain.TrainType}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="text-center md:text-right flex items-center gap-4">
                                <div>
                                    <div className="text-xs text-slate-400 uppercase tracking-wider">Departs {origin}</div>
                                    <div className="text-3xl font-bold text-white">{nextTrain.Departure}</div>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <div className="text-xl font-bold text-yellow-500 animate-pulse">
                                        {nextTrain.ETA}
                                    </div>
                                    {nextTrain.delayStatus && (
                                        <Badge
                                            variant="outline"
                                            className={`
                                                text-[10px] px-2 py-0.5 font-bold
                                                ${nextTrain.delayStatus === "on-time" ? "text-green-400 border-green-500 bg-green-950/30" : ""}
                                                ${nextTrain.delayStatus === "early" ? "text-blue-400 border-blue-500 bg-blue-950/30" : ""}
                                                ${nextTrain.delayStatus === "delayed" ? "text-red-400 border-red-500 bg-red-950/30" : ""}
                                            `}
                                        >
                                            {nextTrain.delayStatus === "on-time" && "ON TIME"}
                                            {nextTrain.delayStatus === "early" && `${Math.abs(nextTrain.delayMinutes!)}m EARLY`}
                                            {nextTrain.delayStatus === "delayed" && `${nextTrain.delayMinutes}m LATE`}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                )}

                {/* Tabular View - Train Predictions Grid */}
                <div className={`grid gap-6 ${journeyDirection ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
                    {/* Show Northbound if direction is NB or null (All) */}
                    {(!journeyDirection || journeyDirection === "NB") && (
                        <PredictionBoard
                            title="Northbound"
                            predictions={nbPredictions}
                            loading={loading}
                            onSelectTrain={setSelectedTrain}
                            selectedTrainId={selectedTrain?.TrainNumber}
                        />
                    )}

                    {/* Show Southbound if direction is SB or null (All) */}
                    {(!journeyDirection || journeyDirection === "SB") && (
                        <PredictionBoard
                            title="Southbound"
                            predictions={sbPredictions}
                            loading={loading}
                            onSelectTrain={setSelectedTrain}
                            selectedTrainId={selectedTrain?.TrainNumber}
                        />
                    )}
                </div>

                {/* Train Approach View - With Selector for Multiple Views */}
                {selectedTrain && (
                    <div className="animate-in slide-in-from-top-10 fade-in duration-500">
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
                )}

                {/* Train Summary - Visible After Progress/Horizontal Views */}
                {selectedTrain && (
                    <div className="animate-in slide-in-from-top-10 fade-in duration-500">
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
                            currentTime={currentTime}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

function PredictionBoard({
    title,
    predictions,
    loading,
    onSelectTrain,
    selectedTrainId,
}: {
    title: string;
    predictions: TrainPrediction[];
    loading: boolean;
    onSelectTrain: (train: TrainPrediction) => void;
    selectedTrainId?: string;
}) {
    return (
        <Card className="bg-black border-4 border-slate-800 shadow-2xl overflow-hidden">
            <CardHeader className="bg-slate-900 border-b border-slate-800 py-3">
                <CardTitle className="text-center text-yellow-500 font-mono text-2xl tracking-wider uppercase">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="bg-black p-4 min-h-[300px]">
                    <div className="grid grid-cols-4 gap-2 text-slate-500 text-xs uppercase tracking-widest mb-2 border-b border-slate-800 pb-2 font-mono">
                        <div>Train</div>
                        <div>Type</div>
                        <div className="text-right">Departs</div>
                        <div className="text-right">Status</div>
                    </div>

                    {loading ? (
                        <div className="space-y-2 mt-4">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-8 w-full bg-slate-900" />
                            ))}
                        </div>
                    ) : predictions.length === 0 ? (
                        <div className="text-slate-600 text-center py-10 font-mono">
                            NO TRAINS SCHEDULED
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {predictions.slice(0, 6).map((p) => (
                                <div
                                    key={p.TrainNumber}
                                    onClick={() => onSelectTrain(p)}
                                    className={`
                                        grid grid-cols-4 gap-2 items-center font-mono text-lg border-b border-slate-900/50 pb-1 cursor-pointer transition-colors
                                        ${selectedTrainId === p.TrainNumber ? "bg-slate-800 text-yellow-400" : "text-yellow-500 hover:bg-slate-900"}
                                    `}
                                >
                                    <div>{p.TrainNumber}</div>
                                    <div>
                                        <Badge
                                            variant="outline"
                                            className={`
                        ${p.TrainType === "Bullet" ? "text-red-500 border-red-900 bg-red-950/30" : ""}
                        ${p.TrainType === "Limited" ? "text-yellow-500 border-yellow-900 bg-yellow-950/30" : ""}
                        ${p.TrainType === "Local" ? "text-green-500 border-green-900 bg-green-950/30" : ""}
                        font-mono text-xs px-1 py-0 h-5
                      `}
                                        >
                                            {p.TrainType}
                                        </Badge>
                                    </div>
                                    <div className="text-right">
                                        {/* Only show strikethrough for significant delays (>2 min), aligned with badge logic */}
                                        {p.delayStatus && (p.delayStatus === "delayed" || p.delayStatus === "early") ? (
                                            <div className="flex flex-col items-end">
                                                <span className="line-through text-slate-500 text-xs">{p.ScheduledTime}</span>
                                                <span className={p.delayStatus === "delayed" ? "text-red-400" : "text-blue-400"}>{p.Departure}</span>
                                            </div>
                                        ) : (
                                            <span className="text-green-400">{p.Departure}</span>
                                        )}
                                    </div>
                                    <div className="text-right flex items-center justify-end gap-2">
                                        <span className="font-bold animate-pulse-slow">{p.ETA}</span>
                                        {p.delayStatus && (
                                            <Badge
                                                variant="outline"
                                                className={`
                                                    text-[10px] px-1.5 py-0 h-4 font-bold
                                                    ${p.delayStatus === "on-time" ? "text-green-400 border-green-700 bg-green-950/30" : ""}
                                                    ${p.delayStatus === "early" ? "text-blue-400 border-blue-700 bg-blue-950/30" : ""}
                                                    ${p.delayStatus === "delayed" ? "text-red-400 border-red-700 bg-red-950/30" : ""}
                                                `}
                                            >
                                                {p.delayStatus === "on-time" && "ON TIME"}
                                                {p.delayStatus === "early" && `${Math.abs(p.delayMinutes!)}m EARLY`}
                                                {p.delayStatus === "delayed" && `${p.delayMinutes}m LATE`}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
