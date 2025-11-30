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
        <div className={`min-h-screen bg-black transition-colors duration-500`}>
            <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-6 font-mono">
                {/* TERMINAL HEADER WITH NEON GLOW */}
                <div className="space-y-4">
                    <div className="border-l-4 border-cyan-400 pl-4 py-2 bg-cyan-950/20">
                        <div className={`text-3xl font-bold text-cyan-300 animate-pulse`} style={{textShadow: '0 0 10px rgba(34, 211, 238, 0.8)'}}>
                            ▸ RAILTIME ▸
                        </div>
                        <div className="text-xs text-cyan-400 mt-1 tracking-widest">
                            real-time caltrain monitoring system v1.0
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-xs px-2">
                        <span className="text-green-400">[SYSTEM ACTIVE]</span>
                        <span className="text-cyan-400">
                            {lastUpdated && `LAST UPDATE: ${lastUpdated.toLocaleTimeString()}`}
                        </span>
                        <div className="flex gap-2">
                            <ThemeSwitcher />
                        </div>
                    </div>

                    <div className="border border-cyan-500/50 border-dashed"></div>
                </div>

                {/* ROUTE CONFIG PANEL */}
                <div className="space-y-2">
                    <div className="text-cyan-400 text-xs font-bold tracking-widest">
                        ╔═══ ROUTE CONFIGURATION ═══╗
                    </div>
                    <div className="border-l-2 border-pink-500 pl-3 py-2 bg-pink-950/10">
                        <div
                            className="flex items-center justify-between cursor-pointer hover:bg-pink-950/20 px-2 py-1 transition-colors"
                            onClick={() => setStationSelectorOpen(!stationSelectorOpen)}
                        >
                            <span className="text-pink-400 font-bold">
                                ► {origin} {destination && destination !== "All" && `→ ${destination}`}
                            </span>
                            <span className="text-green-400 text-xs">
                                [{stationSelectorOpen ? "▼" : "▶"}]
                            </span>
                        </div>
                    </div>

                    {stationSelectorOpen && (
                        <div className="space-y-2 mt-2 p-3 bg-black border border-pink-500/40">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-green-400 text-xs tracking-widest">ORIGIN_STATION</label>
                                    <Select value={origin} onValueChange={setOrigin}>
                                        <SelectTrigger className="bg-black border border-cyan-500/50 text-cyan-300 font-mono text-xs h-8">
                                            <SelectValue placeholder=">" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-black border border-cyan-500 text-cyan-300">
                                            {stations.map((s) => (
                                                <SelectItem key={s.stopname} value={s.stopname}>
                                                    {s.stopname}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-green-400 text-xs tracking-widest">DESTINATION</label>
                                    <Select value={destination} onValueChange={setDestination}>
                                        <SelectTrigger className="bg-black border border-cyan-500/50 text-cyan-300 font-mono text-xs h-8">
                                            <SelectValue placeholder=">" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-black border border-cyan-500 text-cyan-300">
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
                                className="bg-black border border-green-500/50 text-green-400 hover:bg-green-950/30 h-7 text-xs font-mono w-full"
                            >
                                {loading ? "█ SCANNING..." : "▶ REFRESH"}
                            </Button>
                        </div>
                    )}
                </div>

                {/* NEXT TRAIN ALERT */}
                {nextTrain && (
                    <div className="space-y-2">
                        <div className="text-green-400 text-xs font-bold tracking-widest">
                            ╔═══ INCOMING TRAIN ALERT ═══╗
                        </div>
                        <div className="border-2 border-green-500 p-3 bg-green-950/20" style={{boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)'}}>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <div>
                                    <div className="text-green-500 text-xs uppercase tracking-wider">Train ID</div>
                                    <div className="text-yellow-300 text-2xl font-bold">#{nextTrain.TrainNumber}</div>
                                </div>
                                <div>
                                    <div className="text-green-500 text-xs uppercase tracking-wider">Type</div>
                                    <div className="text-cyan-300 text-lg">{nextTrain.TrainType}</div>
                                </div>
                                <div>
                                    <div className="text-green-500 text-xs uppercase tracking-wider">Departure</div>
                                    <div className="text-yellow-300 text-lg">{nextTrain.Departure}</div>
                                </div>
                                <div>
                                    <div className="text-green-500 text-xs uppercase tracking-wider">ETA</div>
                                    <div className="text-pink-400 text-lg font-bold animate-pulse" style={{textShadow: '0 0 10px rgba(244, 63, 94, 0.8)'}}>
                                        {nextTrain.ETA}
                                    </div>
                                </div>
                                {nextTrain.delayStatus && (
                                    <div>
                                        <div className="text-green-500 text-xs uppercase tracking-wider">Status</div>
                                        <div className={`text-sm font-bold ${
                                            nextTrain.delayStatus === "on-time" ? "text-green-400" :
                                            nextTrain.delayStatus === "delayed" ? "text-red-400" : "text-cyan-400"
                                        }`}>
                                            {nextTrain.delayStatus === "on-time" ? "OK" :
                                             nextTrain.delayStatus === "delayed" ? `+${nextTrain.delayMinutes}m` :
                                             `−${Math.abs(nextTrain.delayMinutes!)}m`}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="border border-cyan-500/30 border-dashed"></div>

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

                {/* Tabular View - Train Predictions with Tabs */}
                {(!journeyDirection || (journeyDirection === "NB" && nbPredictions.length > 0) || (journeyDirection === "SB" && sbPredictions.length > 0) || (!journeyDirection && (nbPredictions.length > 0 || sbPredictions.length > 0))) && (
                    <Card className={`${theme.colors.bg.card} border ${theme.colors.ui.border}`}>
                        <CardHeader className={`${theme.colors.bg.secondary} border-b ${theme.colors.ui.border}`}>
                            <CardTitle className={`${theme.colors.text.primary}`}>
                                {journeyDirection ? (journeyDirection === "NB" ? "Northbound" : "Southbound") : "Train Predictions"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            {journeyDirection ? (
                                // Single direction view (streamlined)
                                <PredictionTable
                                    predictions={journeyDirection === "NB" ? nbPredictions : sbPredictions}
                                    loading={loading}
                                    onSelectTrain={setSelectedTrain}
                                    selectedTrainId={selectedTrain?.TrainNumber}
                                    theme={theme}
                                />
                            ) : (
                                // Both directions - use tabs
                                <Tabs defaultValue="northbound" className="w-full">
                                    <TabsList className={`grid w-full grid-cols-2 ${theme.colors.bg.tertiary}`}>
                                        <TabsTrigger value="northbound" className={`${theme.colors.text.primary}`}>
                                            Northbound ({nbPredictions.length})
                                        </TabsTrigger>
                                        <TabsTrigger value="southbound" className={`${theme.colors.text.primary}`}>
                                            Southbound ({sbPredictions.length})
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="northbound" className="mt-4">
                                        <PredictionTable
                                            predictions={nbPredictions}
                                            loading={loading}
                                            onSelectTrain={setSelectedTrain}
                                            selectedTrainId={selectedTrain?.TrainNumber}
                                            theme={theme}
                                        />
                                    </TabsContent>
                                    <TabsContent value="southbound" className="mt-4">
                                        <PredictionTable
                                            predictions={sbPredictions}
                                            loading={loading}
                                            onSelectTrain={setSelectedTrain}
                                            selectedTrainId={selectedTrain?.TrainNumber}
                                            theme={theme}
                                        />
                                    </TabsContent>
                                </Tabs>
                            )}
                        </CardContent>
                    </Card>
                )}

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

                {/* TERMINAL FOOTER */}
                <div className="border-t border-cyan-500/30 pt-4 text-center space-y-1">
                    <a
                        href="https://github.com/theGreatHeisenberg/railtime"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 text-xs hover:text-pink-400 transition-colors font-mono tracking-widest"
                    >
                        {`> github.com/theGreatHeisenberg/railtime`}
                    </a>
                    <p className="text-green-600 text-xs font-mono">
                        [OPEN_SOURCE] [REAL-TIME] [MONITORING]
                    </p>
                </div>
            </div>
        </div>
    );
}

interface PredictionTableProps {
    predictions: TrainPrediction[];
    loading: boolean;
    onSelectTrain: (train: TrainPrediction) => void;
    selectedTrainId?: string;
    theme: any;
}

function PredictionTable({
    predictions,
    loading,
    onSelectTrain,
    selectedTrainId,
    theme,
}: PredictionTableProps) {
    return (
        <div>
            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className={`h-12 w-full ${theme.colors.bg.tertiary}`} />
                    ))}
                </div>
            ) : predictions.length === 0 ? (
                <div className={`${theme.colors.text.muted} text-center py-8`}>
                    No trains scheduled
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow className={`border-b ${theme.colors.ui.border}`}>
                            <TableHead className={theme.colors.text.accent}>Train</TableHead>
                            <TableHead className={theme.colors.text.accent}>Type</TableHead>
                            <TableHead className={`text-right ${theme.colors.text.accent}`}>Departure</TableHead>
                            <TableHead className={`text-right ${theme.colors.text.accent}`}>Status</TableHead>
                            <TableHead className={`text-right ${theme.colors.text.accent}`}>ETA</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {predictions.slice(0, 8).map((p) => (
                            <TableRow
                                key={p.TrainNumber}
                                onClick={() => onSelectTrain(p)}
                                className={`cursor-pointer transition-colors ${
                                    selectedTrainId === p.TrainNumber
                                        ? `${theme.colors.bg.secondary} ${theme.colors.text.primary}`
                                        : `${theme.colors.ui.hover} ${theme.colors.text.primary}`
                                }`}
                            >
                                <TableCell className={`font-semibold ${theme.colors.text.primary}`}>
                                    #{p.TrainNumber}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant="outline"
                                        className={`text-xs font-mono ${
                                            p.TrainType === "Bullet"
                                                ? "text-red-500 border-red-900 bg-red-950/30"
                                                : p.TrainType === "Limited"
                                                    ? "text-yellow-500 border-yellow-900 bg-yellow-950/30"
                                                    : "text-green-500 border-green-900 bg-green-950/30"
                                        }`}
                                    >
                                        {p.TrainType}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {p.delayStatus && (p.delayStatus === "delayed" || p.delayStatus === "early") ? (
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`line-through text-xs ${theme.colors.text.muted}`}>
                                                {p.ScheduledTime}
                                            </span>
                                            <span
                                                className={
                                                    p.delayStatus === "delayed" ? "text-red-400" : "text-blue-400"
                                                }
                                            >
                                                {p.Departure}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-green-400">{p.Departure}</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {p.delayStatus && (
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] font-bold ${
                                                p.delayStatus === "on-time"
                                                    ? "text-green-400 border-green-700 bg-green-950/30"
                                                    : p.delayStatus === "early"
                                                        ? "text-blue-400 border-blue-700 bg-blue-950/30"
                                                        : "text-red-400 border-red-700 bg-red-950/30"
                                            }`}
                                        >
                                            {p.delayStatus === "on-time"
                                                ? "ON TIME"
                                                : p.delayStatus === "early"
                                                    ? `${Math.abs(p.delayMinutes!)}m EARLY`
                                                    : `${p.delayMinutes}m LATE`}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className={`text-right font-bold ${theme.colors.text.primary} animate-pulse-slow`}>
                                    {p.ETA}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
