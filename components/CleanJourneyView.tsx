"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Journey, JourneySearchResponse, DataSource, Station, StopTimeline, TrainDetailsResponse } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, MapPin, Clock, Train, ArrowRight, ArrowLeftRight, RefreshCw, Check, ArrowUp, ArrowDown, Maximize2 } from "lucide-react";
import stationsData from "@/lib/stations.json";
import ServiceAlertsBanner from "./ServiceAlertsBanner";
import LiveStatusBadge from "./LiveStatusBadge";
import JourneyThemeSwitcher from "./JourneyThemeSwitcher";
import Footer from "./Footer";
import { useTheme } from "@/lib/ThemeContext";
import { getTrainTypeStyle } from "@/lib/themes";
import TimeFilterSelector, { TimeFilterModeOption } from "./TimeFilterSelector";
import TimePicker from "./TimePicker";
import { getNextHourRoundedUp } from "@/lib/timeFilterUtils";
import FavoriteRoutes from "./FavoriteRoutes";
import { ActionFeedback, JourneyHeader, TrainTypeFilter } from "./journey";

// Pagination constants
const INITIAL_TRAINS_COUNT = 4;
const LOAD_MORE_COUNT = 3;

const stations = stationsData as Station[];

// Station abbreviations for compact display
const STATION_ABBREVIATIONS: Record<string, string> = {
  "San Francisco": "SFO", "22nd Street": "22S", "Bayshore": "BAY",
  "South San Francisco": "SSF", "San Bruno": "SBR", "Millbrae": "MIL",
  "Broadway": "BWY", "Burlingame": "BUR", "San Mateo": "SMT",
  "Hayward Park": "HWP", "Hillsdale": "HSD", "Belmont": "BEL",
  "San Carlos": "SCA", "Redwood City": "RWC", "Menlo Park": "MNP",
  "Palo Alto": "PAL", "California Avenue": "CAL", "San Antonio": "SAN",
  "Mountain View": "MTV", "Sunnyvale": "SNV", "Lawrence": "LAW",
  "Santa Clara": "SCL", "College Park": "CPK", "San Jose Diridon": "SJD",
  "Tamien": "TAM", "Capitol": "CAP", "Blossom Hill": "BHL",
  "Morgan Hill": "MRH", "San Martin": "SMR", "Gilroy": "GIL",
};

function getStationAbbr(stationName: string): string {
  return STATION_ABBREVIATIONS[stationName] || stationName.substring(0, 3).toUpperCase();
}

// Format minutes to human-readable relative time
function formatRelativeTime(minutes: number | null): string {
  if (minutes === null || minutes < 0) return "--";
  if (minutes === 0) return "Now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return hours === 1 ? "1 hour" : `${hours} hours`;
  return `${hours}h ${mins}m`;
}

// Format departure time with "In" prefix
function formatDepartureTime(minutes: number | null): string {
  if (minutes === null || minutes < 0) return "--";
  if (minutes === 0) return "Now";
  if (minutes < 60) return `In ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return hours === 1 ? "In 1 hour" : `In ${hours} hours`;
  return `In ${hours}h ${mins}m`;
}

// Napkin theme wobbly borders
const NAPKIN_BORDERS = {
  wobbly: "255px 15px 225px 15px / 15px 225px 15px 255px",
  wobblyMd: "95px 4px 97px 5px / 4px 95px 6px 95px",
  wobblySm: "40px 8px 45px 6px / 8px 42px 7px 40px",
};


/**
 * Train Position Track - Visual representation of train location on route
 */
interface TrainPositionTrackProps {
  journey: Journey;
  origin: string;
  destination: string;
  isRealtime: boolean;
  stops: StopTimeline[];
  segment?: { from: string; to: string; progress: number } | null;
  liveStatusMessage?: string | null;
}

function TrainPositionTrack({ journey, origin, destination, isRealtime, stops, segment, liveStatusMessage }: TrainPositionTrackProps) {
  const { theme, themeName } = useTheme();
  const isNapkin = themeName === "napkin";
  const isMinimalist = themeName === "minimalist";
  const isConfetti = themeName === "confetti";
  
  // Track layout constants
  const TRACK_START = 8, TRACK_END = 92, TRACK_LENGTH = TRACK_END - TRACK_START, MIN_SPACING = 18;
  
  // Find the station before Board
  const getPrevStationName = (): string | null => {
    if (stops.length === 0) return null;
    const originIdx = stops.findIndex(s => s.stopName === origin);
    if (originIdx > 0) return stops[originIdx - 1].stopName;
    return null;
  };
  const prevStationName = getPrevStationName();
  
  // Get GPS coordinates from stations data
  const getStationCoords = (stationName: string): { lat: number; lon: number } | null => {
    const station = stations.find(s => s.stopname === stationName);
    return station ? { lat: station.lat, lon: station.lon } : null;
  };
  
  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  
  // Calculate station positions
  const prevCoords = prevStationName ? getStationCoords(prevStationName) : null;
  const boardCoords = getStationCoords(origin);
  const exitCoords = getStationCoords(destination);
  
  let prevToBoardDist = 0, boardToExitDist = 0;
  if (prevCoords && boardCoords) prevToBoardDist = calculateDistance(prevCoords.lat, prevCoords.lon, boardCoords.lat, boardCoords.lon);
  if (boardCoords && exitCoords) boardToExitDist = calculateDistance(boardCoords.lat, boardCoords.lon, exitCoords.lat, exitCoords.lon);
  
  const totalDist = prevToBoardDist + boardToExitDist;
  let prevPos = TRACK_START, boardPos = TRACK_START + (TRACK_LENGTH * 0.3), exitPos = TRACK_END;
  
  if (totalDist > 0) {
    boardPos = TRACK_START + (TRACK_LENGTH * (prevToBoardDist / totalDist));
    if (boardPos - prevPos < MIN_SPACING) boardPos = prevPos + MIN_SPACING;
    if (exitPos - boardPos < MIN_SPACING) boardPos = exitPos - MIN_SPACING;
  } else if (!prevStationName) {
    boardPos = TRACK_START + MIN_SPACING;
  }
  
  // Calculate train position
  const getTrackPosForStation = (stationName: string): number => {
    if (stationName === prevStationName) return prevPos;
    if (stationName === origin) return boardPos;
    if (stationName === destination) return exitPos;
    if (stops.length > 0 && prevStationName) {
      const prevIdx = stops.findIndex(s => s.stopName === prevStationName);
      const originIdx = stops.findIndex(s => s.stopName === origin);
      const destIdx = stops.findIndex(s => s.stopName === destination);
      const stationIdx = stops.findIndex(s => s.stopName === stationName);
      if (stationIdx >= 0) {
        if (stationIdx < prevIdx) return 0;
        if (stationIdx < originIdx) return prevPos + ((stationIdx - prevIdx) / (originIdx - prevIdx)) * (boardPos - prevPos);
        if (stationIdx <= destIdx) return boardPos + ((stationIdx - originIdx) / (destIdx - originIdx)) * (exitPos - boardPos);
        return TRACK_END + 5;
      }
    }
    return boardPos;
  };
  
  let trainPos: number;
  if (segment?.from && segment?.to) {
    trainPos = getTrackPosForStation(segment.from) + (segment.progress * (getTrackPosForStation(segment.to) - getTrackPosForStation(segment.from)));
  } else {
    const isUpcoming = journey.stopsToOrigin > 0;
    if (isUpcoming) {
      trainPos = journey.stopsToOrigin >= 2 ? prevPos - 10 : journey.stopsToOrigin === 1 ? (prevPos + boardPos) / 2 : boardPos - 5;
    } else {
      trainPos = boardPos + ((1 / (journey.stopsBetween + 1)) * (exitPos - boardPos));
    }
  }
  trainPos = Math.max(2, Math.min(TRACK_END + 3, trainPos));

  // Check if this is a scheduled (non-live) train
  const isScheduledTrain = !isRealtime;

  // Station marker component
  const StationMarker = ({ position, label, stationName, time, color }: { 
    position: number; label: string; stationName: string; time: string; color: string;
  }) => {
    const abbr = getStationAbbr(stationName);
    
    return (
      <div className="absolute top-3 flex flex-col items-center transition-all duration-200" style={{ left: `${position}%`, transform: 'translateX(-50%)' }}>
        <div 
          className={`w-5 h-5 ${isConfetti ? "border-2 border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B]" : isNapkin ? "border-[3px] border-[#2d2d2d] shadow-[2px_2px_0px_0px_#2d2d2d]" : isMinimalist ? "border-2 border-black" : ""}`}
          style={{ 
            backgroundColor: color, 
            borderRadius: isMinimalist ? 0 : isNapkin ? NAPKIN_BORDERS.wobblySm : "50%" 
          }} 
        />
        <div className={`w-0.5 h-4`} style={{ backgroundColor: `${color}66` }} />
        <div className="mt-1 text-center">
          <div className={`text-[10px] font-medium uppercase tracking-wide ${theme.classes.textMuted}`}>{label}</div>
          <div className={`font-semibold text-sm ${theme.classes.textPrimary}`}>{abbr}</div>
          {time && <div className={`text-xs ${theme.classes.textMuted}`}>{time}</div>}
        </div>
      </div>
    );
  };

  return (
    <div className={`pt-6 pb-4 border-t ${theme.classes.divider}`}>
      <div className="relative h-28 mx-4">
        {/* Track ties */}
        {Array.from({ length: 12 }, (_, i) => (i + 1) * 8).map((pos) => (
          <div 
            key={pos} 
            className="absolute top-6 w-1 h-3 -translate-y-1/2"
            style={{ 
              left: `${pos}%`, 
              transform: 'translateX(-50%) translateY(-50%)',
              backgroundColor: theme.raw.border.primary,
              borderRadius: isMinimalist ? 0 : "9999px"
            }} 
          />
        ))}
        
        {/* Track line */}
        <div 
          className={`absolute top-6 left-0 right-0 h-2 ${theme.classes.track}`}
          style={{ borderRadius: isMinimalist ? 0 : undefined }}
        />
        
        {/* Progress line - only show for live trains */}
        {!isScheduledTrain && (
          <div 
            className={`absolute top-6 left-0 h-2 transition-all duration-700 ${theme.classes.trackProgress}`}
            style={{ width: `${trainPos}%`, borderRadius: isMinimalist ? 0 : "9999px" }} 
          />
        )}
        
        {/* Train icon - only show animated position for live trains */}
        {!isScheduledTrain && (
          <div className="absolute top-6 z-20 transition-all duration-700 ease-out" style={{ left: `${trainPos}%`, transform: 'translateX(-50%) translateY(-50%)' }}>
            <div 
              className={`w-9 h-9 flex items-center justify-center ${theme.classes.trainIcon} ${isConfetti ? "animate-bounce" : ""}`}
              style={{ borderRadius: isMinimalist ? 0 : isNapkin ? NAPKIN_BORDERS.wobblySm : "50%" }}
            >
              <Train className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
          </div>
        )}
        
        {/* Station markers */}
        {prevStationName && <StationMarker position={prevPos} label="Prev" stationName={prevStationName} time="" color={theme.raw.border.primary} />}
        <StationMarker position={boardPos} label="Board" stationName={journey.origin.stopName} time={journey.origin.predictedTime} color={theme.raw.accent.success} />
        <StationMarker position={exitPos} label="Exit" stationName={destination} time={journey.destination.predictedTime} color={theme.raw.accent.error} />
      </div>
      
      {/* Live status message */}
      {liveStatusMessage && !isScheduledTrain && (
        <div className={`text-center mt-3 text-xs font-medium ${theme.classes.statusOnTime}`}>
          📍 {liveStatusMessage}
        </div>
      )}
      
      {/* Note for scheduled trains */}
      {isScheduledTrain && (
        <div 
          className={`text-center mt-2 text-xs px-4 py-2 mx-4 ${theme.classes.card}`}
          style={{ 
            backgroundColor: `${theme.raw.accent.warning}20`,
            color: theme.raw.accent.warning,
            borderRadius: isMinimalist ? 0 : isNapkin ? NAPKIN_BORDERS.wobblySm : theme.styles.borderRadius
          }}
        >
          <Clock className="w-3 h-3 inline-block mr-1.5 -mt-0.5" strokeWidth={2} />
          Live tracking available when train departs
        </div>
      )}
    </div>
  );
}


/**
 * Train Card Header Component - Used as the clickable header in accordion
 */
interface TrainCardHeaderProps {
  journey: Journey;
  isExpanded: boolean;
  hasETAChanged?: boolean;
  isRealtime: boolean;
  timeFilterMode?: TimeFilterModeOption;
}

function TrainCardHeader({ journey, isExpanded, hasETAChanged, isRealtime, timeFilterMode }: TrainCardHeaderProps) {
  const { theme, themeName } = useTheme();
  const trainStyle = getTrainTypeStyle(theme, journey.trainType);
  const isArriving = journey.origin.etaMinutes !== null && journey.origin.etaMinutes <= 5;
  const isNapkin = themeName === "napkin";
  const isMinimalist = themeName === "minimalist";
  const isConfetti = themeName === "confetti";
  
  const isArriveByMode = timeFilterMode === 'arrive_by';
  const isLeaveByMode = timeFilterMode === 'leave_by';
  const hasTimeFilter = isArriveByMode || isLeaveByMode;
  
  // Live countdown timer for trains arriving in <10 minutes
  const [countdown, setCountdown] = useState<string>("");
  const showCountdown = journey.origin.etaMinutes !== null && journey.origin.etaMinutes <= 10 && journey.origin.etaMinutes >= 0;
  
  useEffect(() => {
    if (!showCountdown || journey.origin.etaMinutes === null) {
      setCountdown("");
      return;
    }
    
    const targetTime = new Date();
    targetTime.setMinutes(targetTime.getMinutes() + journey.origin.etaMinutes);
    
    const updateCountdown = () => {
      const now = new Date();
      const diff = targetTime.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown("0:00");
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [showCountdown, journey.origin.etaMinutes]);

  const isScheduled = journey.isRealtime === false && !journey.isPartialRealtime;

  return (
    <div className="flex items-center justify-between gap-3 w-full">
      <div className="flex items-center gap-3">
        {/* Train icon */}
        <div 
          className={`w-12 h-12 flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
            isConfetti ? 'border-2 border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B]' :
            isNapkin ? 'border-[3px] border-[#2d2d2d] shadow-[3px_3px_0px_0px_#2d2d2d]' :
            isMinimalist ? 'border-2 border-black' : ''
          }`}
          style={{ 
            backgroundColor: trainStyle.bg,
            borderRadius: isMinimalist ? 0 : isNapkin ? NAPKIN_BORDERS.wobblySm : theme.styles.borderRadius,
            transform: isExpanded ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          <Train className="w-6 h-6" style={{ color: trainStyle.text }} strokeWidth={2.5} />
        </div>
        
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-bold text-xl tracking-tight ${theme.classes.textPrimary}`}>
              #{journey.trainNumber}
            </span>
            <span 
              className={`text-xs font-bold px-2.5 py-1 ${
                isConfetti ? 'border-2 border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B]' :
                isNapkin ? 'border-2 border-[#2d2d2d] shadow-[2px_2px_0px_0px_#2d2d2d]' :
                isMinimalist ? 'border-2 border-black uppercase tracking-widest' : ''
              }`}
              style={{ 
                backgroundColor: trainStyle.bg, 
                color: trainStyle.text,
                borderRadius: isMinimalist ? 0 : isNapkin ? NAPKIN_BORDERS.wobblySm : theme.styles.borderRadius,
              }}
            >
              {journey.trainType}
            </span>
            {/* Direction indicator */}
            <span 
              className={`text-[10px] font-medium px-2 py-0.5 flex items-center gap-1 ${theme.classes.textMuted}`}
              style={{ 
                backgroundColor: theme.raw.bg.secondary,
                borderRadius: isMinimalist ? 0 : isNapkin ? NAPKIN_BORDERS.wobblySm : theme.styles.borderRadius
              }}
            >
              {journey.direction === 'NB' ? (
                <><ArrowUp className="w-3 h-3" strokeWidth={2.5} />NB</>
              ) : (
                <><ArrowDown className="w-3 h-3" strokeWidth={2.5} />SB</>
              )}
            </span>
            {/* Scheduled indicator */}
            {isScheduled && (
              <span 
                className={`text-[10px] font-bold px-2 py-0.5`}
                style={{ 
                  backgroundColor: `${theme.raw.accent.warning}20`,
                  color: theme.raw.accent.warning,
                  borderRadius: isMinimalist ? 0 : isNapkin ? NAPKIN_BORDERS.wobblySm : theme.styles.borderRadius
                }}
              >
                Scheduled
              </span>
            )}
            {/* Best Match badge */}
            {journey.isBestMatch && (
              <span 
                className={`text-[10px] font-bold px-2 py-0.5 text-white`}
                style={{ 
                  backgroundColor: theme.raw.accent.success,
                  borderRadius: isMinimalist ? 0 : isNapkin ? NAPKIN_BORDERS.wobblySm : theme.styles.borderRadius
                }}
              >
                ⭐ Best Match
              </span>
            )}
            {/* Minutes before target badge */}
            {hasTimeFilter && journey.minutesBeforeTarget !== undefined && (
              <span 
                className={`text-[10px] font-bold px-2 py-0.5 text-white`}
                style={{ 
                  backgroundColor: theme.raw.accent.success,
                  borderRadius: isMinimalist ? 0 : isNapkin ? NAPKIN_BORDERS.wobblySm : theme.styles.borderRadius
                }}
              >
                {journey.minutesBeforeTarget}m early
              </span>
            )}
          </div>
          <span className={`text-sm ${theme.classes.textMuted}`}>
            {journey.stopsBetween} stops • {formatRelativeTime(journey.journeyDuration)}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="text-right">
          {/* Show departure time (default or leave_by mode) */}
          {!isArriveByMode && (
            <>
              <div className={`flex items-center justify-end gap-1 px-1 ${hasETAChanged ? 'animate-eta-change' : ''}`}>
                {isScheduled && <Clock className="w-4 h-4" style={{ color: theme.raw.accent.warning }} strokeWidth={2.5} />}
                <span 
                  className={`text-3xl font-bold tracking-tight`}
                  style={{ 
                    color: isArriving ? theme.raw.accent.success : 
                           isLeaveByMode ? theme.raw.accent.primary :
                           isScheduled ? theme.raw.text.muted : theme.raw.text.primary
                  }}
                >
                  {formatDepartureTime(journey.origin.etaMinutes)}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <span 
                  className={`text-xs`}
                  style={{ color: isLeaveByMode ? theme.raw.accent.primary : theme.raw.text.muted }}
                >
                  {isLeaveByMode ? "Departs " : ""}{journey.origin.predictedTime}
                </span>
                {/* Live countdown for imminent trains */}
                {showCountdown && countdown && (
                  <span 
                    className="text-xs font-mono font-bold px-1.5 py-0.5 animate-pulse"
                    style={{ 
                      backgroundColor: `${theme.raw.accent.success}20`,
                      color: theme.raw.accent.success,
                      borderRadius: isMinimalist ? 0 : theme.styles.borderRadius
                    }}
                  >
                    {countdown}
                  </span>
                )}
              </div>
            </>
          )}
          {/* Show arrival time for arrive_by mode */}
          {isArriveByMode && (
            <>
              <div className={`flex items-center justify-end gap-1 px-1 ${hasETAChanged ? 'animate-eta-change' : ''}`}>
                {isScheduled && <Clock className="w-4 h-4" style={{ color: theme.raw.accent.warning }} strokeWidth={2.5} />}
                <span 
                  className="text-3xl font-bold tracking-tight"
                  style={{ color: isScheduled ? theme.raw.text.muted : theme.raw.accent.primary }}
                >
                  {journey.destination.predictedTime}
                </span>
              </div>
              <span className="text-xs font-bold" style={{ color: theme.raw.accent.primary }}>
                Arrives
              </span>
              <div className={`text-[10px] mt-0.5 ${theme.classes.textMuted}`}>
                Departs {journey.origin.predictedTime}
              </div>
            </>
          )}
        </div>
        
        {/* View full details button */}
        <a
          href={`/trains/${journey.tripId}`}
          onClick={(e) => e.stopPropagation()}
          className={`w-8 h-8 flex items-center justify-center transition-all duration-200 ${theme.classes.buttonGhost}`}
          style={{ borderRadius: isMinimalist ? 0 : isNapkin ? NAPKIN_BORDERS.wobblySm : theme.styles.borderRadius }}
          title="View full train details"
        >
          <Maximize2 className={`w-4 h-4 ${theme.classes.textMuted}`} />
        </a>
        
        {/* Expand/Collapse chevron */}
        <div 
          className={`w-8 h-8 flex items-center justify-center transition-all duration-300`}
          style={{ 
            backgroundColor: isExpanded ? `${theme.raw.accent.primary}10` : 'transparent',
            borderRadius: isMinimalist ? 0 : isNapkin ? NAPKIN_BORDERS.wobblySm : "50%",
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <ChevronDown className="w-5 h-5" style={{ color: theme.raw.accent.primary }} />
        </div>
      </div>
    </div>
  );
}


/**
 * Journey Details Component - The full feature-rich detail view
 */
interface JourneyDetailsProps {
  journey: Journey;
  destination: string;
  origin: string;
  isRealtime: boolean;
  onOriginETAUpdate?: (tripId: string, newEtaMinutes: number | null, newPredictedTime: string) => void;
}

function JourneyDetails({ journey, destination, origin, isRealtime, onOriginETAUpdate }: JourneyDetailsProps) {
  const { theme, themeName } = useTheme();
  const isNapkin = themeName === "napkin";
  const isMinimalist = themeName === "minimalist";
  const isConfetti = themeName === "confetti";
  
  const [showAllStops, setShowAllStops] = useState(false);
  const [stops, setStops] = useState<StopTimeline[]>([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [segment, setSegment] = useState<{ from: string; to: string; progress: number } | null>(null);
  const lastSegmentRef = useRef<{ from: string; to: string; progress: number } | null>(null);
  
  // Fetch stops and sync origin ETA with parent
  const fetchStops = useCallback(async () => {
    try {
      const response = await fetch(`/api/trains/${journey.tripId}`);
      const data: TrainDetailsResponse = await response.json();
      if (response.ok && data.trip?.stops) {
        setStops(data.trip.stops);
        
        // Sync origin ETA with parent to keep header timer accurate
        const originStop = data.trip.stops.find(s => s.stopName === origin);
        if (originStop && onOriginETAUpdate) {
          onOriginETAUpdate(journey.tripId, originStop.etaMinutes, originStop.predictedTime);
        }
      }
    } catch (err) { console.error("Failed to fetch stops:", err); }
    finally { setLoadingStops(false); }
  }, [journey.tripId, origin, onOriginETAUpdate]);
  
  // Fetch GPS position
  const fetchPosition = useCallback(async () => {
    try {
      const response = await fetch(`/api/trains/${journey.tripId}/position?origin=${origin}&destination=${destination}`);
      const data = await response.json();
      if (response.ok && data.position?.currentSegment) {
        const seg = data.position.currentSegment;
        const newSegment = { from: seg.from?.stopName || '', to: seg.to?.stopName || '', progress: seg.progress || 0 };
        const lastSeg = lastSegmentRef.current;
        if (!lastSeg || newSegment.from !== lastSeg.from || newSegment.to !== lastSeg.to || newSegment.progress >= lastSeg.progress) {
          lastSegmentRef.current = newSegment;
          setSegment(newSegment);
        }
      }
    } catch (err) { console.error("Failed to fetch position:", err); }
  }, [journey.tripId, origin, destination]);

  useEffect(() => {
    setLoadingStops(true);
    fetchStops();
    fetchPosition();
    const stopsInterval = setInterval(fetchStops, 15000);
    const positionInterval = setInterval(fetchPosition, 10000);
    return () => { clearInterval(stopsInterval); clearInterval(positionInterval); };
  }, [fetchStops, fetchPosition]);
  
  useEffect(() => {
    setStops([]);
    setSegment(null);
    lastSegmentRef.current = null;
    setLoadingStops(true);
  }, [journey.tripId]);
  
  const journeyIsRealtime = journey.isRealtime !== false;
  
  const getLiveStatusMessage = (): string | null => {
    if (!journeyIsRealtime || !segment) return null;
    const { from, to, progress } = segment;
    if (!from || !to) return null;
    if (progress < 0.1) return `Departing ${from}`;
    if (progress > 0.9) return `Approaching ${to}`;
    return `${from} → ${to}`;
  };
  
  const liveStatusMessage = getLiveStatusMessage();
  
  // All stops in journey order
  const allStops = (() => {
    if (stops.length === 0) return [];
    const originIdx = stops.findIndex(s => s.stopName === origin);
    const destIdx = stops.findIndex(s => s.stopName === destination);
    return originIdx > destIdx ? [...stops].reverse() : stops;
  })();

  return (
    <div className={`${theme.classes.card} overflow-hidden relative`} style={{ borderTop: `1px solid ${theme.raw.border.primary}` }}>
      
      {/* Stats row */}
      <div className="flex" style={{ backgroundColor: theme.raw.bg.secondary }}>
        <div 
          className={`flex-1 p-3 text-center flex items-center justify-center gap-2 ${isConfetti || isNapkin ? 'py-2 px-3' : ''}`}
          style={isConfetti || isNapkin ? { 
            backgroundColor: theme.raw.accent.secondary,
            margin: '0.5rem',
            borderRadius: isNapkin ? NAPKIN_BORDERS.wobblySm : '9999px',
            border: isConfetti ? '2px solid #1E293B' : isNapkin ? '3px solid #2d2d2d' : undefined,
            boxShadow: isConfetti ? '2px 2px 0px 0px #1E293B' : isNapkin ? '2px 2px 0px 0px #2d2d2d' : undefined
          } : undefined}
        >
          <MapPin className="w-4 h-4" style={{ color: isConfetti || isNapkin ? '#FFFFFF' : theme.raw.accent.warning }} strokeWidth={2.5} />
          <span className={`text-sm font-medium`} style={{ color: isConfetti || isNapkin ? '#FFFFFF' : theme.raw.text.primary }}>
            {journey.stopsBetween} Stops
          </span>
        </div>
        <div 
          className={`flex-1 p-3 text-center flex items-center justify-center gap-2 ${isConfetti || isNapkin ? 'py-2 px-3' : ''}`}
          style={isConfetti || isNapkin ? { 
            backgroundColor: theme.raw.accent.error,
            margin: '0.5rem',
            borderRadius: isNapkin ? NAPKIN_BORDERS.wobblySm : '9999px',
            border: isConfetti ? '2px solid #1E293B' : isNapkin ? '3px solid #2d2d2d' : undefined,
            boxShadow: isConfetti ? '2px 2px 0px 0px #1E293B' : isNapkin ? '2px 2px 0px 0px #2d2d2d' : undefined
          } : undefined}
        >
          <Clock className="w-4 h-4" style={{ color: isConfetti || isNapkin ? '#FFFFFF' : theme.raw.accent.primary }} strokeWidth={2.5} />
          <span className={`text-sm font-medium`} style={{ color: isConfetti || isNapkin ? '#FFFFFF' : theme.raw.text.primary }}>
            {formatRelativeTime(journey.journeyDuration)}
          </span>
        </div>
        <div 
          className={`flex-1 p-3 text-center flex items-center justify-center gap-2 ${isConfetti || isNapkin ? 'py-2 px-3' : ''}`}
          style={isConfetti || isNapkin ? { 
            backgroundColor: journeyIsRealtime ? theme.raw.accent.success : theme.raw.accent.warning,
            margin: '0.5rem',
            borderRadius: isNapkin ? NAPKIN_BORDERS.wobblySm : '9999px',
            border: isConfetti ? '2px solid #1E293B' : isNapkin ? '3px solid #2d2d2d' : undefined,
            boxShadow: isConfetti ? '2px 2px 0px 0px #1E293B' : isNapkin ? '2px 2px 0px 0px #2d2d2d' : undefined
          } : undefined}
        >
          <span className={`text-sm font-medium`} style={{ color: isConfetti || isNapkin ? '#FFFFFF' : theme.raw.text.primary }}>
            {journeyIsRealtime ? "● Live" : "○ Schedule"}
          </span>
        </div>
      </div>

      {/* Train Position Track */}
      <TrainPositionTrack 
        journey={journey}
        origin={origin}
        destination={destination}
        isRealtime={journeyIsRealtime}
        stops={stops}
        segment={segment}
        liveStatusMessage={liveStatusMessage}
      />
      
      {/* Show stops button */}
      <button 
        onClick={() => setShowAllStops(!showAllStops)} 
        className={`w-full flex items-center justify-center gap-2 p-3 transition-all duration-200 ${theme.classes.textPrimary}`}
        style={{ 
          borderTop: `1px solid ${theme.raw.border.primary}`,
          backgroundColor: theme.raw.bg.secondary
        }}
      >
        {showAllStops ? <><ChevronUp className="w-4 h-4" />Hide Stops</> : <><ChevronDown className="w-4 h-4" />Show All {journey.totalStops} Stops</>}
      </button>

      {/* Stops list */}
      {showAllStops && (
        <div className="p-4" style={{ borderTop: `1px solid ${theme.raw.border.primary}`, backgroundColor: theme.raw.bg.card }}>
          {loadingStops ? (
            <div className={`text-center py-4 ${theme.classes.textMuted}`}>Loading stops...</div>
          ) : allStops.length > 0 ? (
            <div className="space-y-0">
              {allStops.map((stop, idx) => {
                const isOriginStop = stop.stopName === origin;
                const isDestStop = stop.stopName === destination;
                const isPassed = stop.status === 'passed' || stop.status === 'departed';
                const isCurrent = stop.status === 'approaching';
                const isLast = idx === allStops.length - 1;
                
                return (
                  <div key={stop.stopName} className="flex items-start gap-3 stop-reveal-item" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="flex flex-col items-center">
                      <div 
                        className={`w-4 h-4 rounded-full ${isConfetti || isNapkin ? "border-2 border-[#1E293B] shadow-[1px_1px_0px_0px_#1E293B]" : ""}`}
                        style={{ 
                          backgroundColor: isOriginStop ? theme.raw.accent.success : isDestStop ? theme.raw.accent.error : isPassed ? theme.raw.accent.primary : isCurrent ? theme.raw.accent.primary : theme.raw.border.primary 
                        }} 
                      />
                      {!isLast && <div className="w-0.5 h-8" style={{ backgroundColor: isPassed ? theme.raw.accent.primary : theme.raw.border.primary }} />}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium`} style={{ color: isPassed ? theme.raw.accent.primary : theme.raw.text.primary }}>
                            {stop.stopName}
                          </span>
                          {isPassed && <span style={{ color: theme.raw.accent.primary }}>✓</span>}
                          {isCurrent && (
                            <span 
                              className="text-xs px-2 py-0.5 text-white font-medium animate-pulse"
                              style={{ backgroundColor: theme.raw.accent.primary, borderRadius: theme.styles.borderRadius }}
                            >
                              Now
                            </span>
                          )}
                          {isOriginStop && !isCurrent && (
                            <span 
                              className="text-xs px-2 py-0.5 text-white font-medium"
                              style={{ backgroundColor: theme.raw.accent.success, borderRadius: theme.styles.borderRadius }}
                            >
                              Board
                            </span>
                          )}
                          {isDestStop && !isCurrent && (
                            <span 
                              className="text-xs px-2 py-0.5 text-white font-medium"
                              style={{ backgroundColor: theme.raw.accent.error, borderRadius: theme.styles.borderRadius }}
                            >
                              Exit
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          {stop.etaMinutes !== null && !isPassed ? (
                            <span className="font-medium" style={{ color: stop.etaMinutes <= 5 ? theme.raw.accent.success : theme.raw.text.primary }}>
                              {formatRelativeTime(stop.etaMinutes)}
                            </span>
                          ) : (
                            <span className={theme.classes.textMuted}>{stop.predictedTime}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`text-center py-4 ${theme.classes.textMuted}`}>No stops data available</div>
          )}
        </div>
      )}
    </div>
  );
}


/**
 * Expandable Train Card - Wraps TrainCardHeader + JourneyDetails in accordion style
 */
interface ExpandableTrainCardProps {
  journey: Journey;
  isExpanded: boolean;
  onToggle: () => void;
  origin: string;
  destination: string;
  isRealtime: boolean;
  hasETAChanged?: boolean;
  timeFilterMode?: TimeFilterModeOption;
  onOriginETAUpdate?: (tripId: string, newEtaMinutes: number | null, newPredictedTime: string) => void;
}

const ExpandableTrainCard = React.forwardRef<HTMLDivElement, ExpandableTrainCardProps>(
  ({ journey, isExpanded, onToggle, origin, destination, isRealtime, hasETAChanged, timeFilterMode, onOriginETAUpdate }, ref) => {
    const { theme, themeName } = useTheme();
    const isNapkin = themeName === "napkin";
    const isMinimalist = themeName === "minimalist";
    const isConfetti = themeName === "confetti";
    
    // Get expanded border/shadow styles
    const getExpandedStyles = () => {
      if (isExpanded) {
        return { 
          borderColor: theme.raw.accent.primary, 
          boxShadow: isConfetti ? '6px 6px 0px 0px #1E293B' : 
                     isNapkin ? '6px 6px 0px 0px #2d2d2d' : 
                     `0 0 0 2px ${theme.raw.accent.primary}30`
        };
      }
      return {};
    };
    
    return (
      <div
        ref={ref}
        className={`transition-all duration-300 overflow-hidden ${theme.classes.card}`}
        style={{
          ...getExpandedStyles(),
          borderRadius: isMinimalist ? 0 : isNapkin ? NAPKIN_BORDERS.wobblyMd : theme.styles.borderRadius,
        }}
      >
        {/* Clickable Header */}
        <button
          onClick={onToggle}
          className={`w-full text-left p-4 transition-all duration-200 ${theme.classes.cardHover}`}
        >
          <TrainCardHeader
            journey={journey}
            isExpanded={isExpanded}
            hasETAChanged={hasETAChanged}
            isRealtime={isRealtime}
            timeFilterMode={timeFilterMode}
          />
        </button>
        
        {/* Expandable Details with max-height animation */}
        <div 
          className="overflow-hidden transition-all duration-500 ease-in-out"
          style={{ 
            maxHeight: isExpanded ? '1000px' : '0',
            opacity: isExpanded ? 1 : 0,
          }}
        >
          <JourneyDetails
            journey={journey}
            origin={origin}
            destination={destination}
            isRealtime={isRealtime}
            onOriginETAUpdate={onOriginETAUpdate}
          />
        </div>
      </div>
    );
  }
);

ExpandableTrainCard.displayName = 'ExpandableTrainCard';


/**
 * Main CleanJourneyView Component - Accordion-style expandable cards
 */
export default function CleanJourneyView() {
  const { theme, themeName } = useTheme();
  const isNapkin = themeName === "napkin";
  const isMinimalist = themeName === "minimalist";
  const isConfetti = themeName === "confetti";
  const isSwiss = themeName === "swiss" || themeName === "swiss-dark";
  
  // URL state management
  const searchParams = useSearchParams();
  const router = useRouter();
  const isInitializedRef = useRef(false);
  
  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Accordion state
  const [expandedJourney, setExpandedJourney] = useState<string | null>(null);
  const expandedCardRef = useRef<HTMLDivElement>(null);
  
  // Time filter state
  const [timeFilterMode, setTimeFilterMode] = useState<TimeFilterModeOption>('depart_now');
  const [targetTime, setTargetTime] = useState<Date>(() => getNextHourRoundedUp(new Date()));
  
  // Train type filter state
  const [trainTypeFilters, setTrainTypeFilters] = useState<Record<string, boolean>>({
    'Local': true, 'Limited': true, 'Bullet': true,
  });
  
  // Feedback state
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  
  // Incremental loading state
  const [visibleTrainsCount, setVisibleTrainsCount] = useState(INITIAL_TRAINS_COUNT);
  
  // Data change highlighting
  const previousETAsRef = useRef<Record<string, number | null>>({});
  const [changedTrainIds, setChangedTrainIds] = useState<Set<string>>(new Set());
  
  // Error handling
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const showFeedback = useCallback((message: string) => {
    setFeedbackMessage(message);
    setFeedbackVisible(true);
    setTimeout(() => setFeedbackVisible(false), 2000);
  }, []);
  
  // Sync state to URL
  const updateURL = useCallback((newOrigin: string, newDest: string, newMode: TimeFilterModeOption, newTime: Date) => {
    const params = new URLSearchParams();
    if (newOrigin) params.set('from', newOrigin);
    if (newDest) params.set('to', newDest);
    if (newMode !== 'depart_now') {
      params.set('mode', newMode);
      params.set('time', newTime.toISOString());
    }
    const newURL = params.toString() ? `?${params.toString()}` : '/';
    router.replace(newURL, { scroll: false });
  }, [router]);

  // Handle accordion toggle
  const handleToggleExpand = useCallback((journeyId: string) => {
    if (expandedJourney === journeyId) {
      setExpandedJourney(null);
      showFeedback("Collapsed train details");
    } else {
      setExpandedJourney(journeyId);
      const journey = journeys.find(j => j.tripId === journeyId);
      showFeedback(`Viewing Train #${journey?.trainNumber || journeyId}`);
      setTimeout(() => {
        expandedCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [expandedJourney, journeys, showFeedback]);
  
  const handleLoadMore = useCallback(() => {
    setVisibleTrainsCount(prev => Math.min(prev + LOAD_MORE_COUNT, journeys.length));
    showFeedback(`Loaded ${LOAD_MORE_COUNT} more trains`);
  }, [journeys.length, showFeedback]);
  
  // Sync origin ETA from expanded card's stops data (more frequent updates)
  const handleOriginETAUpdate = useCallback((tripId: string, newEtaMinutes: number | null, newPredictedTime: string) => {
    setJourneys(prev => prev.map(j => {
      if (j.tripId !== tripId) return j;
      // Only update if ETA actually changed
      if (j.origin.etaMinutes === newEtaMinutes) return j;
      return {
        ...j,
        origin: {
          ...j.origin,
          etaMinutes: newEtaMinutes,
          predictedTime: newPredictedTime,
        }
      };
    }));
  }, []);
  
  const toggleTrainType = useCallback((trainType: string) => {
    setTrainTypeFilters(prev => {
      const newFilters = { ...prev, [trainType]: !prev[trainType] };
      const enabledCount = Object.values(newFilters).filter(Boolean).length;
      if (enabledCount === 0) {
        showFeedback('At least one train type must be selected');
        return prev;
      }
      setExpandedJourney(null);
      return newFilters;
    });
  }, [showFeedback]);
  
  useEffect(() => {
    setVisibleTrainsCount(INITIAL_TRAINS_COUNT);
  }, [origin, destination, timeFilterMode]);

  // Load from URL params first, then localStorage, then defaults
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    
    const urlOrigin = searchParams.get('from');
    const urlDest = searchParams.get('to');
    const urlMode = searchParams.get('mode') as TimeFilterModeOption | null;
    const urlTime = searchParams.get('time');
    
    // Determine origin
    let newOrigin = "";
    if (urlOrigin && stations.find(s => s.stopname === urlOrigin)) {
      newOrigin = urlOrigin;
    } else {
      const savedOrigin = localStorage.getItem("selectedOrigin");
      if (savedOrigin && stations.find(s => s.stopname === savedOrigin)) {
        newOrigin = savedOrigin;
      } else if (stations.find(s => s.stopname === "Sunnyvale")) {
        newOrigin = "Sunnyvale";
      } else if (stations.length > 0) {
        newOrigin = stations[0].stopname;
      }
    }
    
    // Determine destination
    let newDest = "";
    if (urlDest && stations.find(s => s.stopname === urlDest)) {
      newDest = urlDest;
    } else {
      const savedDest = localStorage.getItem("selectedDestination");
      if (savedDest && savedDest !== "All" && stations.find(s => s.stopname === savedDest)) {
        newDest = savedDest;
      } else if (stations.find(s => s.stopname === "Palo Alto")) {
        newDest = "Palo Alto";
      } else if (stations.find(s => s.stopname === "San Francisco")) {
        newDest = "San Francisco";
      } else if (stations.length > 1) {
        newDest = stations[stations.length - 1].stopname;
      }
    }
    
    // Set time filter from URL
    if (urlMode && ['depart_now', 'leave_by', 'arrive_by'].includes(urlMode)) {
      setTimeFilterMode(urlMode);
      if (urlTime) {
        const parsedTime = new Date(urlTime);
        if (!isNaN(parsedTime.getTime())) {
          setTargetTime(parsedTime);
        }
      }
    }
    
    setOrigin(newOrigin);
    setDestination(newDest);
  }, [searchParams]);

  // Save to localStorage and update URL
  useEffect(() => { 
    if (origin) {
      localStorage.setItem("selectedOrigin", origin);
      if (isInitializedRef.current && destination) {
        updateURL(origin, destination, timeFilterMode, targetTime);
      }
    }
  }, [origin, destination, timeFilterMode, targetTime, updateURL]);
  
  useEffect(() => { 
    if (destination) {
      localStorage.setItem("selectedDestination", destination);
    }
  }, [destination]);

  const expandedJourneyIdRef = useRef<string | null>(null);
  useEffect(() => { expandedJourneyIdRef.current = expandedJourney; }, [expandedJourney]);

  const fetchJourneys = useCallback(async () => {
    if (!origin || !destination || origin === destination) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ origin, destination });
      if (timeFilterMode !== 'depart_now') {
        params.set('timeFilter', timeFilterMode);
        params.set('targetTime', targetTime.toISOString());
      }
      
      const response = await fetch(`/api/journeys?${params}`);
      const data: JourneySearchResponse = await response.json();
      if (response.ok) {
        // Data change highlighting
        const newChangedIds = new Set<string>();
        const newETAs: Record<string, number | null> = {};
        
        data.journeys.forEach(journey => {
          const prevETA = previousETAsRef.current[journey.tripId];
          const newETA = journey.origin.etaMinutes;
          newETAs[journey.tripId] = newETA;
          if (prevETA !== undefined && prevETA !== newETA) {
            newChangedIds.add(journey.tripId);
          }
        });
        
        previousETAsRef.current = newETAs;
        if (newChangedIds.size > 0) {
          setChangedTrainIds(newChangedIds);
          setTimeout(() => setChangedTrainIds(new Set()), 2000);
        }
        
        setJourneys(data.journeys);
        setDataSource(data.metadata.dataSource);
        setLastUpdated(new Date());
        
        const currentExpandedId = expandedJourneyIdRef.current;
        if (currentExpandedId && !data.journeys.find(j => j.tripId === currentExpandedId)) {
          setExpandedJourney(null);
        }
        
        setFetchError(null);
      }
    } catch (err) { 
      console.error("Failed to fetch journeys:", err);
      setFetchError("Unable to load train schedules. This might be a temporary connection issue.");
    }
    finally { setLoading(false); }
  }, [origin, destination, timeFilterMode, targetTime]);

  useEffect(() => {
    fetchJourneys();
    const interval = setInterval(fetchJourneys, 30000);
    return () => clearInterval(interval);
  }, [fetchJourneys]);

  const handleSwap = () => { 
    const temp = origin; 
    setOrigin(destination); 
    setDestination(temp); 
    setExpandedJourney(null); 
  };

  const filteredJourneys = journeys.filter(j => trainTypeFilters[j.trainType] !== false);
  const displayedJourneys = filteredJourneys.slice(0, visibleTrainsCount);
  const hasMoreTrains = visibleTrainsCount < filteredJourneys.length;
  const remainingCount = filteredJourneys.length - visibleTrainsCount;
  const isRealtime = dataSource?.type === "realtime";


  return (
    <div className={`min-h-screen ${theme.classes.container} ${theme.classes.textPrimary} ${theme.typography.fontFamily}`}>
      <ActionFeedback message={feedbackMessage} visible={feedbackVisible} />
      
      <div className="max-w-3xl mx-auto p-4 lg:p-6">
        {/* Header */}
        <JourneyHeader dataSource={dataSource} lastUpdated={lastUpdated} />

        {/* Route Selection */}
        <div 
          className={`${theme.classes.card} p-4 mb-6 relative overflow-hidden`}
          style={{ borderRadius: isMinimalist ? 0 : isNapkin ? NAPKIN_BORDERS.wobblyMd : theme.styles.borderRadius }}
        >
          {/* Left accent bar */}
          {(isSwiss || isMinimalist) && (
            <div 
              className="absolute top-0 left-0 w-1.5 h-full"
              style={{ backgroundColor: theme.raw.accent.primary, borderRadius: isSwiss ? `${theme.styles.borderRadius} 0 0 ${theme.styles.borderRadius}` : 0 }}
            />
          )}
          
          {/* Station Selectors */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 lg:gap-4 relative">
            <div className="flex-1 min-w-0">
              <label className={`text-[10px] ${theme.classes.textMuted} uppercase tracking-widest font-medium mb-1.5 block`}>From</label>
              <Select value={origin} onValueChange={(v) => { setOrigin(v); setExpandedJourney(null); }}>
                <SelectTrigger 
                  className={`w-full h-11 ${theme.classes.input} font-medium`}
                  style={{ borderRadius: isMinimalist ? 0 : isNapkin ? NAPKIN_BORDERS.wobblySm : undefined }}
                >
                  <SelectValue placeholder="Origin" />
                </SelectTrigger>
                <SelectContent 
                  className={theme.classes.card}
                  style={{ borderRadius: isMinimalist ? 0 : isNapkin ? NAPKIN_BORDERS.wobblySm : undefined }}
                >
                  {stations.map((s) => (
                    <SelectItem key={s.stop1} value={s.stopname} disabled={s.stopname === destination}>{s.stopname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <button 
              onClick={handleSwap} 
              className={`self-center sm:self-auto flex-shrink-0 w-11 h-11 ${theme.classes.buttonPrimary} transition-all hover:scale-105 flex items-center justify-center`}
              style={{ borderRadius: isMinimalist ? 0 : undefined }}
              aria-label="Swap stations"
            >
              <ArrowLeftRight className="w-4 h-4 text-white" />
            </button>
            
            <div className="flex-1 min-w-0">
              <label className={`text-[10px] ${theme.classes.textMuted} uppercase tracking-widest font-medium mb-1.5 block`}>To</label>
              <Select value={destination} onValueChange={(v) => { setDestination(v); setExpandedJourney(null); }}>
                <SelectTrigger 
                  className={`w-full h-11 ${theme.classes.input} font-medium`}
                  style={{ borderRadius: isMinimalist ? 0 : isNapkin ? NAPKIN_BORDERS.wobblySm : undefined }}
                >
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent 
                  className={theme.classes.card}
                  style={{ borderRadius: isMinimalist ? 0 : isNapkin ? NAPKIN_BORDERS.wobblySm : undefined }}
                >
                  {stations.map((s) => (
                    <SelectItem key={s.stop1} value={s.stopname} disabled={s.stopname === origin}>{s.stopname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Favorite Routes */}
          <FavoriteRoutes
            currentOrigin={origin}
            currentDestination={destination}
            onSelectRoute={(o, d) => {
              setOrigin(o);
              setDestination(d);
              setExpandedJourney(null);
            }}
            theme={theme}
            showFeedback={showFeedback}
          />
          
          {/* Time Filter Controls */}
          <div 
            className="mt-4 pt-4"
            style={{ borderTop: `1px solid ${theme.raw.border.primary}` }}
          >
            <div className="flex flex-wrap items-center gap-4">
              <TimeFilterSelector 
                value={timeFilterMode} 
                onChange={(mode) => { setTimeFilterMode(mode); setExpandedJourney(null); }} 
              />
              {timeFilterMode !== 'depart_now' && (
                <TimePicker 
                  value={targetTime} 
                  onChange={(time) => { setTargetTime(time); setExpandedJourney(null); }} 
                />
              )}
              
              {/* Train Type Filter Badges */}
              <TrainTypeFilter filters={trainTypeFilters} onToggle={toggleTrainType} />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && journeys.length === 0 && (
          <div 
            className={`text-center py-8 ${theme.classes.textMuted} ${theme.classes.card}`}
            style={{ borderRadius: isMinimalist ? 0 : theme.styles.borderRadius }}
          >
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: theme.raw.accent.primary }} />
            <span>Finding trains...</span>
          </div>
        )}

        {/* Error Message */}
        {fetchError && !loading && (
          <div 
            className={`text-center py-6 px-4 ${theme.classes.card}`}
            style={{ 
              borderRadius: isMinimalist ? 0 : theme.styles.borderRadius,
              borderColor: theme.raw.accent.error
            }}
          >
            <div className="text-2xl mb-2">🚂</div>
            <p className="font-medium mb-1" style={{ color: theme.raw.accent.error }}>Connection hiccup</p>
            <p className={`text-sm mb-4 ${theme.classes.textMuted}`}>{fetchError}</p>
            <button 
              onClick={() => { setFetchError(null); fetchJourneys(); }} 
              className={`text-sm px-4 py-2 text-white transition-all`}
              style={{ backgroundColor: theme.raw.accent.primary, borderRadius: theme.styles.borderRadius }}
            >
              Try again
            </button>
          </div>
        )}

        {/* No Trains */}
        {!loading && origin && destination && origin !== destination && journeys.length === 0 && (
          <div 
            className={`text-center py-8 p-6 ${theme.classes.card} ${theme.classes.textMuted}`}
            style={{ borderRadius: isMinimalist ? 0 : theme.styles.borderRadius }}
          >
            <Train className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className={`font-semibold ${theme.classes.textPrimary}`}>No trains found for this route</p>
            <button 
              onClick={handleSwap} 
              className={`mt-3 text-xs px-3 py-1.5 text-white transition-all`}
              style={{ backgroundColor: theme.raw.accent.primary, borderRadius: theme.styles.borderRadius }}
            >
              Try {destination} → {origin} instead
            </button>
          </div>
        )}

        {/* Main Content - Expandable Train Cards */}
        {journeys.length > 0 && (
          <div className="space-y-3">
            {/* Section header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-1.5 h-5"
                  style={{ 
                    background: `linear-gradient(to bottom, ${theme.raw.accent.primary}, ${theme.raw.accent.success})`,
                    borderRadius: "9999px"
                  }}
                />
                <h2 className={`text-lg font-bold ${theme.classes.textPrimary} tracking-wide`}>
                  Departures
                </h2>
              </div>
              <span className={`text-xs ${theme.classes.textMuted}`}>
                {filteredJourneys.length} train{filteredJourneys.length !== 1 ? 's' : ''} • Click to expand
              </span>
            </div>
            
            {/* Expandable Train Cards */}
            {displayedJourneys.map((journey) => (
              <ExpandableTrainCard
                key={journey.tripId}
                ref={expandedJourney === journey.tripId ? expandedCardRef : null}
                journey={journey}
                isExpanded={expandedJourney === journey.tripId}
                onToggle={() => handleToggleExpand(journey.tripId)}
                origin={origin}
                destination={destination}
                isRealtime={isRealtime}
                hasETAChanged={changedTrainIds.has(journey.tripId)}
                timeFilterMode={timeFilterMode}
                onOriginETAUpdate={handleOriginETAUpdate}
              />
            ))}
            
            {/* Load more button */}
            {hasMoreTrains && (
              <button 
                onClick={handleLoadMore} 
                className={`w-full text-center text-xs py-2.5 flex items-center justify-center gap-1 ${theme.classes.buttonSecondary}`}
                style={{ borderRadius: isMinimalist ? 0 : theme.styles.borderRadius }}
              >
                <ChevronDown className="w-3 h-3" />
                <span>Show {Math.min(LOAD_MORE_COUNT, remainingCount)} more train{Math.min(LOAD_MORE_COUNT, remainingCount) !== 1 ? "s" : ""}</span>
                <span className="ml-1 opacity-60">({remainingCount} remaining)</span>
              </button>
            )}
            
            {!hasMoreTrains && journeys.length > INITIAL_TRAINS_COUNT && (
              <div className={`text-center py-2 text-xs ${theme.classes.textMuted}`}>
                All {filteredJourneys.length} trains loaded
              </div>
            )}
          </div>
        )}

        <div 
          className={`text-center text-[10px] ${theme.classes.textMuted} pt-6 mt-4`}
          style={{ borderTop: `1px solid ${theme.raw.border.primary}` }}
        >
          <span style={{ color: theme.raw.accent.primary }}>●</span> Auto-refreshes every 30 seconds
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
