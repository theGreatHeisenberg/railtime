"use client";

import { useEffect, useState, useRef } from "react";
import { Station, TrainPrediction, VehiclePosition } from "@/lib/types";
import { fetchVehiclePositions } from "@/lib/caltrain";
import { Train, MapPin, Navigation, X, ArrowRight, ArrowLeft, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TrainApproachViewProps {
    train: TrainPrediction;
    origin: string;
    stations: Station[];
    onClose: () => void;
}

type Theme = 'default' | 'cyberpunk' | 'midnight' | 'sunset';

export default function TrainApproachView({ train, origin, stations, onClose }: TrainApproachViewProps) {
    const [vehiclePosition, setVehiclePosition] = useState<VehiclePosition | null>(null);
    const [now, setNow] = useState(new Date());

    // 1. Filter and Sort Stations - ALWAYS North to South (Ascending IDs)
    const sortedStations = [...stations].sort((a, b) => {
        const idA = parseInt(a.stop1);
        const idB = parseInt(b.stop1);
        return idA - idB; // Always North (Low ID) to South (High ID)
    });

    // 2. Calculate cumulative distances for proportional spacing
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
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

    // Normalize positions to 0-100%
    const normalizedStations = stationPositions.map(s => ({
        ...s,
        percent: totalDist > 0 ? (s.dist / totalDist) * 100 : 0
    }));

    // 3. Fetch Vehicle Position
    useEffect(() => {
        const fetchPos = async () => {
            const allPositions = await fetchVehiclePositions();

            // Try to match by TripId (TrainNumber)
            const match = allPositions.find(p => p.Vehicle.Trip.TripId === train.TrainNumber);

            if (match) {
                setVehiclePosition(match);
            }
        };

        fetchPos();
        const interval = setInterval(fetchPos, 10000);
        const timeInterval = setInterval(() => setNow(new Date()), 1000);

        return () => {
            clearInterval(interval);
            clearInterval(timeInterval);
        };
    }, [train.TrainNumber]);

    // 4. Calculate Train Position with Better Precision
    const getTrainPercent = () => {
        if (!vehiclePosition) return null;

        const trainLat = vehiclePosition.Vehicle.Position.Latitude;
        const trainLon = vehiclePosition.Vehicle.Position.Longitude;

        // Find the two closest stations to interpolate between
        let closestIdx = 0;
        let minD = Infinity;

        sortedStations.forEach((s, i) => {
            const d = getDistance(trainLat, trainLon, s.lat, s.lon);
            if (d < minD) {
                minD = d;
                closestIdx = i;
            }
        });

        // Try to find which segment the train is on
        let segmentStartIdx = closestIdx;
        let segmentEndIdx = closestIdx;
        let interpolationFactor = 0;

        // Check if we should interpolate with previous or next station
        if (closestIdx > 0) {
            const prevStation = sortedStations[closestIdx - 1];
            const currStation = sortedStations[closestIdx];

            // Calculate distances
            const distToPrev = getDistance(trainLat, trainLon, prevStation.lat, prevStation.lon);
            const distToCurr = getDistance(trainLat, trainLon, currStation.lat, currStation.lon);
            const segmentLength = getDistance(prevStation.lat, prevStation.lon, currStation.lat, currStation.lon);

            // If train is between prev and curr stations
            if (distToPrev + distToCurr <= segmentLength * 1.2) { // 20% tolerance for GPS inaccuracy
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

        // Calculate the interpolated percent
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

    // 5. Dynamic Zoom: Smart Viewport
    // Goal: Show Train and Origin, but limit max stations to avoid crowding.
    // Max stations to display comfortably: ~12 (450px / 12 = ~37px per station)

    const MAX_VISIBLE_STATIONS = 12;

    type StationWithDisplay = typeof normalizedStations[0] & { displayPercent: number };
    let visibleStations: StationWithDisplay[] = [];

    // Determine focus point: Train (if found) or Origin (fallback)
    const focusIdx = trainPercent !== null ? trainStationIdx : originIdx;

    if (originIdx !== -1) {
        // Determine direction of travel relative to station array indices
        // Stations are sorted North (0) to South (N)
        // SB: Train (Low) -> Origin (High). Moving Down.
        // NB: Train (High) -> Origin (Low). Moving Up.

        const isSB = train.Direction === "SB";

        // Ideal range: Focus to Origin (plus padding)
        let idealStart = Math.min(focusIdx, originIdx) - 1;
        let idealEnd = Math.max(focusIdx, originIdx) + 1;

        // Clamp to array bounds
        idealStart = Math.max(0, idealStart);
        idealEnd = Math.min(normalizedStations.length - 1, idealEnd);

        const span = idealEnd - idealStart + 1;

        let startIdx = 0;
        let endIdx = normalizedStations.length - 1;

        if (span <= MAX_VISIBLE_STATIONS) {
            // If the whole path fits, show it!
            startIdx = idealStart;
            endIdx = idealEnd;
        } else {
            // Path is too long. Focus on Train/Focus Point.
            if (isSB) {
                // Moving South (Index Increasing). Show Focus and stations ahead.
                startIdx = Math.max(0, focusIdx - 2); // 2 stations behind
                endIdx = Math.min(normalizedStations.length - 1, startIdx + MAX_VISIBLE_STATIONS - 1);
            } else {
                // Moving North (Index Decreasing). Show Focus and stations ahead (lower index).
                endIdx = Math.min(normalizedStations.length - 1, focusIdx + 2); // 2 stations behind (South)
                startIdx = Math.max(0, endIdx - MAX_VISIBLE_STATIONS + 1);
            }
        }

        const slicedStations = normalizedStations.slice(startIdx, endIdx + 1);

        // Recalculate percentages for visible segment only
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
        // Fallback: show all stations with their original percentages if origin not found or other issue
        visibleStations = normalizedStations.map(s => ({
            ...s,
            displayPercent: s.percent
        }));
    }

    // Theme State
    const [theme, setTheme] = useState<Theme>('default');

    // Calculate train's display percent in the zoomed view
    const getTrainDisplayPercent = () => {
        if (trainPercent === null || visibleStations.length === 0) return null;

        const minPercent = visibleStations[0].percent;
        const maxPercent = visibleStations[visibleStations.length - 1].percent;
        const range = maxPercent - minPercent;

        return range > 0 ? ((trainPercent - minPercent) / range) * 100 : 50;
    };

    const trainDisplayPercent = getTrainDisplayPercent();

    // --- THEME STYLES ---
    const getThemeStyles = (currentTheme: Theme) => {
        switch (currentTheme) {
            case 'cyberpunk':
                return {
                    card: "bg-black border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.15)]",
                    header: "bg-black/90 border-b border-cyan-900/50",
                    text: "font-mono text-cyan-400",
                    title: "text-cyan-300 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(103,232,249,0.5)]",
                    subtext: "text-cyan-700",
                    trackBg: "bg-cyan-900/20",
                    trackPattern: "linear-gradient(to bottom, transparent 50%, #083344 50%)",
                    trackFill: "bg-gradient-to-b from-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(6,182,212,0.8)]",
                    stationDot: (isOrigin: boolean, isPassed: boolean) =>
                        isOrigin ? "bg-cyan-400 border-cyan-100 shadow-[0_0_20px_rgba(34,211,238,1)]" :
                            isPassed ? "bg-cyan-900 border-cyan-700" : "bg-black border-cyan-800",
                    stationText: (isOrigin: boolean) => isOrigin ? "text-cyan-300 font-bold drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]" : "text-cyan-800",
                    trainIcon: "text-black bg-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.8)] border-2 border-white",
                    trainLabel: "bg-black/80 border border-cyan-500/50 text-cyan-400 font-mono text-xs",
                    grid: "opacity-20 bg-[linear-gradient(to_right,#083344_1px,transparent_1px),linear-gradient(to_bottom,#083344_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]",
                    footer: "bg-black/90 border-t border-cyan-900/50 text-cyan-500"
                };
            case 'midnight':
                return {
                    card: "bg-slate-950 border-indigo-500/30 shadow-2xl",
                    header: "bg-slate-900/90 border-b border-indigo-900/50",
                    text: "text-indigo-200",
                    title: "text-indigo-100 font-bold tracking-wide",
                    subtext: "text-indigo-400",
                    trackBg: "bg-indigo-950/50",
                    trackPattern: "linear-gradient(to bottom, transparent 50%, #1e1b4b 50%)",
                    trackFill: "bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]",
                    stationDot: (isOrigin: boolean, isPassed: boolean) =>
                        isOrigin ? "bg-indigo-400 border-white shadow-[0_0_20px_rgba(129,140,248,0.8)]" :
                            isPassed ? "bg-indigo-900 border-indigo-700" : "bg-slate-900 border-slate-700",
                    stationText: (isOrigin: boolean) => isOrigin ? "text-indigo-300 font-bold" : "text-slate-500",
                    trainIcon: "bg-white text-indigo-900 border-2 border-indigo-200 shadow-[0_0_20px_rgba(255,255,255,0.4)]",
                    trainLabel: "bg-slate-900/90 border border-indigo-500/30 text-indigo-200 text-xs",
                    grid: "opacity-10 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px]",
                    footer: "bg-slate-900 border-t border-indigo-900/30 text-indigo-300"
                };
            case 'sunset':
                return {
                    card: "bg-gradient-to-br from-orange-950 to-rose-950 border-orange-500/30 shadow-2xl",
                    header: "bg-black/20 border-b border-orange-500/20 backdrop-blur-md",
                    text: "text-orange-100",
                    title: "text-orange-50 font-bold tracking-wide",
                    subtext: "text-orange-300/80",
                    trackBg: "bg-orange-950/50",
                    trackPattern: "linear-gradient(to bottom, transparent 50%, #431407 50%)",
                    trackFill: "bg-gradient-to-r from-orange-500 to-rose-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]",
                    stationDot: (isOrigin: boolean, isPassed: boolean) =>
                        isOrigin ? "bg-orange-400 border-white shadow-[0_0_20px_rgba(251,146,60,0.8)]" :
                            isPassed ? "bg-orange-900/50 border-orange-800" : "bg-black/40 border-orange-900/30",
                    stationText: (isOrigin: boolean) => isOrigin ? "text-orange-200 font-bold" : "text-orange-400/50",
                    trainIcon: "bg-orange-100 text-orange-900 border-2 border-orange-200 shadow-[0_0_20px_rgba(255,237,213,0.4)]",
                    trainLabel: "bg-black/60 border border-orange-500/30 text-orange-100 text-xs backdrop-blur-md",
                    grid: "opacity-20 bg-[linear-gradient(to_right,#7c2d12_1px,transparent_1px),linear-gradient(to_bottom,#7c2d12_1px,transparent_1px)] bg-[size:24px_24px]",
                    footer: "bg-black/20 border-t border-orange-500/20 text-orange-200"
                };
            default: // Default Slate
                return {
                    card: "bg-slate-900 border-slate-800 text-slate-100 shadow-2xl",
                    header: "bg-slate-950 border-b border-slate-800",
                    text: "text-slate-100",
                    title: "text-slate-100",
                    subtext: "text-slate-400",
                    trackBg: "bg-slate-700",
                    trackPattern: "linear-gradient(to bottom, transparent 50%, #475569 50%)",
                    trackFill: "bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]",
                    stationDot: (isOrigin: boolean, isPassed: boolean) =>
                        isOrigin ? "bg-blue-500 border-white shadow-[0_0_15px_rgba(59,130,246,0.8)]" :
                            isPassed ? "bg-red-900 border-red-700" : "bg-slate-900 border-slate-600",
                    stationText: (isOrigin: boolean) => isOrigin ? "text-blue-400 font-bold text-base" : "text-slate-400",
                    trainIcon: "bg-yellow-500 text-black border-2 border-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.6)]",
                    trainLabel: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 backdrop-blur-sm",
                    grid: "hidden",
                    footer: "bg-slate-900 border-t border-slate-800 text-slate-200"
                };
        }
    };

    const themeStyles = getThemeStyles(theme);

    return (
        <Card className={`${themeStyles.card} overflow-hidden transition-all duration-500`}>
            {/* Background Grid for Cyberpunk */}
            <div className={`absolute inset-0 pointer-events-none ${themeStyles.grid}`} />

            <CardHeader className={`flex flex-row items-center justify-between pb-4 relative z-10 ${themeStyles.header}`}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full border ${theme === 'cyberpunk' ? 'bg-cyan-900/20 border-cyan-500/30' : 'bg-white/5 border-white/10'}`}>
                        <Train className={`h-8 w-8 ${theme === 'cyberpunk' ? 'text-cyan-400' : theme === 'default' ? 'text-yellow-500' : 'text-white'}`} />
                    </div>
                    <div>
                        <CardTitle className={`text-xl flex items-center gap-2 ${themeStyles.title}`}>
                            Approaching {origin}
                            <span className={`text-sm font-normal px-2 py-0.5 rounded-full border ${theme === 'cyberpunk' ? 'bg-cyan-900/30 border-cyan-700 text-cyan-300' : 'bg-white/10 border-white/20 text-white/70'}`}>
                                Train #{train.TrainNumber}
                            </span>
                        </CardTitle>
                        <div className={`text-sm flex items-center gap-2 mt-1 ${themeStyles.subtext}`}>
                            <Navigation className="h-3 w-3" />
                            {train.ETA === "Now" ? "Arriving Now" : `Arriving in ${train.ETA}`}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-white/70">
                                <Palette className="h-4 w-4" />
                                Theme
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setTheme('default')}>Default</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme('cyberpunk')}>Cyberpunk</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme('midnight')}>Midnight</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme('sunset')}>Sunset</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="ghost" size="icon" onClick={onClose} className="text-white/50 hover:text-white hover:bg-white/10">
                        <X className="h-6 w-6" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6 relative bg-transparent">

                {/* Horizontal Subway-Style Map Container */}
                <div className="relative w-full h-[250px] flex justify-center items-center z-10 px-16">
                    {/* Horizontal container */}
                    <div className="relative w-full h-20">

                        {/* Main Track Line (Horizontal) */}
                        <div className={`absolute top-1/2 left-0 w-full h-2 -translate-y-1/2 rounded-full ${themeStyles.trackBg}`}>
                            {/* Dotted pattern overlay */}
                            <div className="w-full h-full opacity-40"
                                style={{
                                    backgroundImage: themeStyles.trackPattern,
                                    backgroundSize: '20px 100%' // Rotated pattern
                                }}
                            />
                        </div>

                        {/* Travelled Track Line */}
                        {trainDisplayPercent !== null && (
                            <div
                                className={`absolute top-1/2 -translate-y-1/2 rounded-full ${themeStyles.trackFill}`}
                                style={{
                                    transition: 'left 2s ease-out, right 2s ease-out, width 2s ease-out',
                                    // North (0%) is Right (100%), South (100%) is Left (0%)
                                    // NB (South->North): Left->Right. Start at Left (0). Width = (100 - trainDisplayPercent)%
                                    // SB (North->South): Right->Left. Start at Right (100). Width?
                                    // Let's use left/right positioning.

                                    // If NB (South -> North): Moving Left -> Right.
                                    // Track should fill from Left (South) to Train.
                                    // Train is at `left: 100 - trainDisplayPercent`.
                                    // So left: 0, width: (100 - trainDisplayPercent)%

                                    // If SB (North -> South): Moving Right -> Left.
                                    // Track should fill from Right (North) to Train.
                                    // Train is at `left: 100 - trainDisplayPercent`.
                                    // So right: 0, width: trainDisplayPercent% (Wait. North is 0%. Train is at 10%. Screen pos is 90%. Width from right is 100-90=10%. Correct.)

                                    left: train.Direction === "NB" ? '0%' : 'auto',
                                    right: train.Direction === "SB" ? '0%' : 'auto',
                                    width: train.Direction === "NB"
                                        ? `${100 - trainDisplayPercent}%`
                                        : `${trainDisplayPercent}%`,
                                    height: '10px'
                                }}
                            />
                        )}

                        {/* Stations Nodes */}
                        {visibleStations.map((s, i) => {
                            const isOrigin = s.stopname === origin;
                            const isPassed = trainDisplayPercent !== null && (
                                train.Direction === "NB"
                                    ? s.displayPercent > trainDisplayPercent // NB goes 100->0. Passed if s > train (e.g. s=80, train=50. 80 is "behind" 50? No. 100 is start. 80 is passed. 50 is current. 0 is dest.)
                                    // Wait. NB: South(100) -> North(0).
                                    // If train is at 50.
                                    // Stations at 80 (South of train) are passed.
                                    // Stations at 20 (North of train) are ahead.
                                    // So if s.percent > train.percent, it is passed. Correct.

                                    : s.displayPercent < trainDisplayPercent // SB goes 0->100.
                                // If train is at 50.
                                // Stations at 20 (North of train) are passed.
                                // Stations at 80 (South of train) are ahead.
                                // So if s.percent < train.percent, it is passed. Correct.
                            );

                            const stopIdToCheck = train.Direction === "NB" ? s.stop1 : s.stop2;
                            const isScheduledStop = train.stopIds.includes(stopIdToCheck);

                            // Improved staggering: Alternate more aggressively to reduce overlap
                            // Group scheduled stops differently from non-scheduled
                            const scheduledStopsBeforeThis = visibleStations
                                .slice(0, i)
                                .filter(st => {
                                    const stopId = train.Direction === "NB" ? st.stop1 : st.stop2;
                                    return train.stopIds.includes(stopId);
                                });
                            const isTopLabel = isScheduledStop ? scheduledStopsBeforeThis.length % 2 === 0 : i % 2 === 1;

                            // Hide non-scheduled stops if they're too close to scheduled ones
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
                                    className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-500 group"
                                    style={{ left: `${100 - s.displayPercent}%` }}
                                >
                                    {/* Station Label */}
                                    <div
                                        className={`
                                            absolute whitespace-nowrap text-sm font-medium transition-all duration-300
                                            ${themeStyles.stationText(isOrigin)}
                                            ${trainDisplayPercent !== null && Math.abs(s.displayPercent - trainDisplayPercent) < 5 && !isOrigin ? 'opacity-0' : 'opacity-100'}
                                            ${isTopLabel ? '-top-10' : 'top-8'}
                                            ${shouldHideNonScheduled ? 'opacity-0 scale-75' : !isScheduledStop && !isOrigin ? 'opacity-30 scale-75 group-hover:opacity-100 group-hover:scale-100' : ''}
                                            ${isScheduledStop || isOrigin ? 'group-hover:scale-110' : ''}
                                        `}
                                    >
                                        {s.stopname}
                                        {/* Departure Time for Origin */}
                                        {isOrigin && (
                                            <div className={`absolute top-full mt-1 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap ${theme === 'cyberpunk' ? 'text-cyan-500' : 'text-slate-400'}`}>
                                                Departs {train.Departure}
                                            </div>
                                        )}

                                        {/* Tooltip on hover for all stations */}
                                        {!isOrigin && (
                                            <div className={`
                                                absolute ${isTopLabel ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2
                                                px-2 py-1 rounded text-xs whitespace-nowrap
                                                opacity-0 group-hover:opacity-100 pointer-events-none
                                                transition-opacity duration-200 z-50
                                                ${theme === 'cyberpunk' ? 'bg-cyan-900/90 text-cyan-200 border border-cyan-500/50' : 'bg-slate-800/90 text-slate-200 border border-slate-600/50'}
                                            `}>
                                                {isScheduledStop ? '🚂 Scheduled Stop' : 'Express (No Stop)'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Node Dot */}
                                    <div className={`
                                        rounded-full border-2 z-10 transition-colors duration-300 relative
                                        ${themeStyles.stationDot(isOrigin, isPassed)}
                                        ${isOrigin ? 'w-6 h-6' : isScheduledStop ? 'w-4 h-4' : 'w-2 h-2 opacity-50'}
                                    `} />

                                    {/* Connecting line to label */}
                                    {isScheduledStop && (
                                        <div className={`
                                            absolute w-0.5 h-4 
                                            ${isTopLabel ? '-top-4' : 'top-4'}
                                            ${isOrigin && theme === 'cyberpunk' ? 'bg-cyan-500' : isOrigin ? 'bg-blue-500' : isPassed && theme === 'cyberpunk' ? 'bg-cyan-900' : isPassed ? 'bg-red-700' : theme === 'cyberpunk' ? 'bg-cyan-900/50' : 'bg-slate-600'}
                                        `} />
                                    )}
                                </div>
                            );
                        })}

                        {/* Train Icon */}
                        {trainDisplayPercent !== null && (
                            <div
                                className="absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
                                style={{
                                    left: `${100 - trainDisplayPercent}%`,
                                    transition: 'left 2s ease-out'
                                }}
                            >
                                {/* Train icon with integrated train number */}
                                <div className="relative flex items-center justify-center">
                                    <div className={`absolute -inset-2 rounded-full animate-ping ${theme === 'cyberpunk' ? 'bg-cyan-400/30' : 'bg-yellow-500/20'}`} />

                                    {/* Direction Arrow - Left (SB) */}
                                    {train.Direction === "SB" && (
                                        <div className={`mr-2 animate-pulse ${theme === 'cyberpunk' ? 'text-cyan-400' : 'text-white'}`}>
                                            <ArrowLeft className="h-5 w-5" />
                                        </div>
                                    )}

                                    <div className="relative">
                                        <div className={`p-2 rounded-full ${themeStyles.trainIcon}`}>
                                            <Train className="h-6 w-6" />
                                        </div>
                                        {/* Train number badge on icon - improved visibility */}
                                        <div className={`
                                            absolute -top-1 -right-1 min-w-[1.5rem] h-6 px-1.5 rounded-full
                                            flex items-center justify-center text-[11px] font-bold
                                            border-2 shadow-lg
                                            ${theme === 'cyberpunk'
                                                ? 'bg-cyan-400 text-black border-cyan-200 shadow-cyan-500/50'
                                                : theme === 'midnight'
                                                ? 'bg-indigo-500 text-white border-indigo-200 shadow-indigo-500/50'
                                                : theme === 'sunset'
                                                ? 'bg-orange-500 text-white border-orange-200 shadow-orange-500/50'
                                                : 'bg-red-600 text-white border-red-300 shadow-red-500/50'
                                            }
                                        `}>
                                            {train.TrainNumber}
                                        </div>
                                        {/* Delay status badge below train icon */}
                                        {train.delayStatus && (
                                            <div className={`
                                                absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap
                                                px-2 py-0.5 rounded text-[9px] font-bold border
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
                                        <div className={`ml-2 animate-pulse ${theme === 'cyberpunk' ? 'text-cyan-400' : 'text-white'}`}>
                                            <ArrowRight className="h-5 w-5" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Arriving In Span Arrow Visualization - Positioned independently, pulled down further */}
                        {trainDisplayPercent !== null && visibleStations.find(s => s.stopname === origin) && (
                            (() => {
                                const station = visibleStations.find(s => s.stopname === origin)!;

                                const trainLeft = 100 - trainDisplayPercent;
                                const stationLeft = 100 - station.displayPercent;

                                const leftPos = Math.min(trainLeft, stationLeft);
                                const rightPos = Math.max(trainLeft, stationLeft);
                                const width = rightPos - leftPos;

                                const isTrainLeftOfStation = trainLeft < stationLeft;
                                const arrowPointsRight = isTrainLeftOfStation;

                                // Only show if distance is significant
                                if (width < 5) return null;

                                return (
                                    <div
                                        className="absolute top-[calc(50%+5.5rem)] h-14 flex flex-col items-center justify-start pointer-events-none"
                                        style={{
                                            left: `${leftPos}%`,
                                            width: `${width}%`,
                                            transition: 'left 2s ease-out, width 2s ease-out'
                                        }}
                                    >
                                        {/* Arrow Line Container */}
                                        <div className="w-full relative flex items-center justify-center mb-1.5">
                                            {/* Dotted Line */}
                                            <div className={`w-full border-b-2 border-dotted ${theme === 'cyberpunk' ? 'border-cyan-500/50' : 'border-white/50'}`}></div>

                                            {/* Arrow Head - Points in direction of travel */}
                                            {arrowPointsRight ? (
                                                // Points Right
                                                <div className={`absolute right-0 w-2 h-2 border-r-2 border-t-2 transform rotate-45 -translate-y-[1px] ${theme === 'cyberpunk' ? 'border-cyan-400' : 'border-white'}`}></div>
                                            ) : (
                                                // Points Left
                                                <div className={`absolute left-0 w-2 h-2 border-l-2 border-b-2 transform rotate-45 -translate-y-[1px] ${theme === 'cyberpunk' ? 'border-cyan-400' : 'border-white'}`}></div>
                                            )}
                                        </div>

                                        {/* Text (Below Arrow) - Color based on delay status */}
                                        <div className={`text-xs font-mono whitespace-nowrap drop-shadow-md ${
                                            train.delayStatus === "delayed"
                                                ? 'text-red-400'
                                                : train.delayStatus === "early"
                                                ? 'text-blue-400'
                                                : (theme === 'cyberpunk' ? 'text-cyan-400' : 'text-green-400')
                                        }`}>
                                            arriving in {train.ETA.replace(' min', ' mins')}
                                        </div>
                                    </div>
                                );
                            })()
                        )}

                        {trainDisplayPercent === null && (
                            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-full border text-sm flex items-center gap-2 shadow-lg ${theme === 'cyberpunk' ? 'bg-black/90 border-red-500/50 text-red-400' : 'bg-slate-900/90 border-red-500/50 text-red-400'}`}>
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                Live tracking unavailable
                            </div>
                        )}

                    </div>

                    {/* Direction Labels */}
                    <div className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs uppercase tracking-wider font-bold ${theme === 'cyberpunk' ? 'text-cyan-800' : 'text-slate-500'}`}>
                        North →
                    </div>
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-xs uppercase tracking-wider font-bold ${theme === 'cyberpunk' ? 'text-cyan-800' : 'text-slate-500'}`}>
                        ← South
                    </div>
                </div>

            </CardContent>

            {/* Footer Info */}
            <div className={`p-4 grid grid-cols-2 gap-4 text-center text-sm ${themeStyles.footer}`}>
                <div>
                    <div className="text-slate-500 mb-1">Distance to {origin}</div>
                    <div className={`font-mono text-lg ${theme === 'cyberpunk' ? 'text-cyan-300' : theme === 'midnight' ? 'text-indigo-200' : theme === 'sunset' ? 'text-orange-200' : 'text-slate-200'}`}>
                        {originStation && vehiclePosition ?
                            // Calculate real distance
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
                    <div className="text-slate-500 mb-1">Next Stop</div>
                    <div className={`font-medium truncate px-2 ${theme === 'cyberpunk' ? 'text-cyan-300' : theme === 'midnight' ? 'text-indigo-200' : theme === 'sunset' ? 'text-orange-200' : 'text-slate-200'}`}>
                        {(() => {
                            if (trainPercent === null) return "--";

                            // Find next valid stop in the schedule based on train's actual position
                            const candidates = normalizedStations.filter((s) => {
                                // Direction check: stations ahead of the train on its route
                                // NB: Moving from South (high %) to North (low %). Next stops have lower percent.
                                // SB: Moving from North (low %) to South (high %). Next stops have higher percent.
                                const isAhead = train.Direction === "NB"
                                    ? s.percent < trainPercent
                                    : s.percent > trainPercent;

                                if (!isAhead) return false;

                                // Schedule check: only show scheduled stops
                                const stopIdToCheck = train.Direction === "NB" ? s.stop1 : s.stop2;
                                return train.stopIds.includes(stopIdToCheck);
                            });

                            if (candidates.length === 0) return "Terminus";

                            // Sort by proximity to train's current position
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
        </Card>
    );
}
