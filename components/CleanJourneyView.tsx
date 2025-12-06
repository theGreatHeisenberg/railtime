"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Journey, JourneySearchResponse, DataSource, Station, StopTimeline, TrainDetailsResponse } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, MapPin, Clock, Train, ArrowRight, ArrowLeftRight, RefreshCw, Check, ArrowUp, ArrowDown } from "lucide-react";
import stationsData from "@/lib/stations.json";
import ServiceAlertsBanner from "./ServiceAlertsBanner";
import LiveStatusBadge from "./LiveStatusBadge";
import JourneyThemeSwitcher from "./JourneyThemeSwitcher";

import Footer from "./Footer";
import { useTheme } from "@/lib/ThemeContext";
import { ThemeName } from "@/lib/themes";
import TimeFilterSelector, { TimeFilterModeOption } from "./TimeFilterSelector";
import TimePicker from "./TimePicker";
import { getNextHourRoundedUp } from "@/lib/timeFilterUtils";
import FavoriteRoutes from "./FavoriteRoutes";

// Clarity-First UX: Action Feedback Toast Component
interface ActionFeedbackProps {
  message: string | null;
  visible: boolean;
  themeName: ThemeName;
}

function ActionFeedback({ message, visible, themeName }: ActionFeedbackProps) {
  const isConfetti = themeName === 'confetti';
  const isDark = themeName === 'obsidian' || themeName === 'swiss-dark';
  
  const getBgColor = () => {
    if (themeName === 'swiss') return '#FFFFFF';
    if (themeName === 'swiss-dark') return '#1F2937';
    if (themeName === 'confetti') return '#FFFFFF';
    if (themeName === 'obsidian') return '#0a0a0c';
    if (themeName === 'napkin') return '#fdfbf7';
    if (themeName === 'minimalist') return '#FFFFFF';
    return '#FFFFFF';
  };
  
  const getTextColor = () => {
    if (isDark) return '#FFFFFF';
    return '#0F172A';
  };
  
  const getAccentColor = () => {
    if (themeName === 'swiss') return '#10B981';
    if (themeName === 'swiss-dark') return '#34D399';
    if (themeName === 'confetti') return '#34D399';
    if (themeName === 'obsidian') return '#34D399';
    if (themeName === 'napkin') return '#ff4d4d';
    if (themeName === 'minimalist') return '#FF3000';
    return '#22C55E';
  };
  
  return (
    <div 
      className="fixed top-20 left-1/2 z-50 transition-all duration-300 pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? '0' : '-10px'})`,
      }}
    >
      <div 
        className={`flex items-center gap-2 px-4 py-2 ${isConfetti ? 'rounded-xl border-2 shadow-[3px_3px_0px_0px_#1E293B]' : 'rounded-lg shadow-lg'}`}
        style={{
          backgroundColor: getBgColor(),
          borderColor: isConfetti ? '#1E293B' : 'transparent',
        }}
      >
        <Check className="w-4 h-4" style={{ color: getAccentColor() }} />
        <span className="text-sm font-medium" style={{ color: getTextColor() }}>
          {message}
        </span>
      </div>
    </div>
  );
}

// Pagination constants for incremental loading
const INITIAL_TRAINS_COUNT = 4;
const LOAD_MORE_COUNT = 3;

const stations = stationsData as Station[];

// Swiss Design System Constants (Caltrain Red Theme)
const FLAT = {
  primary: "#E31837",
  secondary: "#22C55E",
  accent: "#F59E0B",
  foreground: "#111827",
  background: "#FFFFFF",
  muted: "#F3F4F6",
  border: "#E5E7EB",
};

// Sketch/Hand-Drawn Design System Constants
const SKETCH = {
  paper: "#fdfbf7",
  pencil: "#2d2d2d",
  muted: "#e5e0d8",
  accent: "#ff4d4d",
  blue: "#2d5da1",
  postit: "#fff9c4",
  wobbly: "255px 15px 225px 15px / 15px 225px 15px 255px",
  wobblyMd: "95px 4px 97px 5px / 4px 95px 6px 95px",
  wobblySm: "40px 8px 45px 6px / 8px 42px 7px 40px",
};

// Playful Geometric Design System Constants
const PLAYFUL = {
  cream: "#FFFDF5",
  slate: "#1E293B",
  violet: "#8B5CF6",
  pink: "#F472B6",
  amber: "#FBBF24",
  mint: "#34D399",
  muted: "#64748B",
};

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

// Get theme-aware classes for the main container
function getThemeClasses(themeName: ThemeName) {
  switch (themeName) {
    case "swiss":
      return {
        bg: "bg-white", text: "text-[#111827]", card: "bg-white",
        cardHover: "hover:scale-[1.02]", muted: "text-[#6B7280]",
        accent: "text-[#E31837]", header: "bg-[#F3F4F6]",
        headerText: "text-[#E31837]", input: "bg-[#F3F4F6]",
        divider: "border-[#E5E7EB]", isSwiss: true, isSwissDark: false, isConfetti: false,
      };
    case "swiss-dark":
      return {
        bg: "bg-[#111827]", text: "text-[#F9FAFB]", card: "bg-[#1F2937]",
        cardHover: "hover:scale-[1.02]", muted: "text-[#9CA3AF]",
        accent: "text-[#F87171]", header: "bg-[#1F2937]",
        headerText: "text-[#F87171]", input: "bg-[#1F2937]",
        divider: "border-[#374151]", isSwiss: true, isSwissDark: true, isConfetti: false,
      };
    case "obsidian":
      return {
        bg: "bg-[#050506]", text: "text-[#EDEDEF]",
        card: "bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.06]",
        cardHover: "hover:bg-white/[0.08] hover:border-white/[0.10]",
        muted: "text-[#8A8F98]", accent: "text-[#5E6AD2]",
        header: "bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.06]",
        headerText: "text-[#5E6AD2]", input: "bg-[#0f0f12] border-white/[0.10]",
        divider: "border-white/[0.06]", isSwiss: false, isSwissDark: false, isConfetti: false,
      };
    case "napkin":
      return {
        bg: "bg-[#fdfbf7] sketch-paper", text: "text-[#2d2d2d]",
        card: "bg-white border-[#2d2d2d] border-[3px]",
        cardHover: "hover:shadow-[2px_2px_0px_0px_#2d2d2d] hover:translate-x-[2px] hover:translate-y-[2px]",
        muted: "text-[#2d2d2d]/50", accent: "text-[#ff4d4d]",
        header: "bg-white border-[#2d2d2d] border-[3px]",
        headerText: "text-[#2d2d2d]", input: "bg-white border-[#2d2d2d] border-2",
        divider: "border-[#2d2d2d]/30 border-dashed",
        isSwiss: false, isSwissDark: false, isConfetti: false, isNapkin: true,
      };
    case "minimalist":
      return {
        bg: "bg-white minimalist-grid", text: "text-black font-inter",
        card: "bg-white border-2 border-black",
        cardHover: "hover:bg-[#FF3000] hover:text-white transition-all duration-150",
        muted: "text-[#666666]", accent: "text-[#FF3000]",
        header: "bg-[#F2F2F2] border-b-4 border-black",
        headerText: "text-black font-inter uppercase tracking-wider",
        input: "bg-white border-b-2 border-black", divider: "border-black",
        isSwiss: false, isSwissDark: false, isConfetti: false, isMinimalist: true,
      };
    case "confetti":
    default:
      return {
        bg: "bg-[#FFFDF5] playful-dots", text: "text-[#1E293B]",
        card: "bg-white border-[#1E293B] border-2",
        cardHover: "hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#1E293B] playful-bounce",
        muted: "text-[#64748B]", accent: "text-[#8B5CF6]",
        header: "bg-white border-[#1E293B] border-2",
        headerText: "text-[#8B5CF6]", input: "bg-white border-[#1E293B] border-2",
        divider: "border-[#E2E8F0]", isSwiss: false, isSwissDark: false, isConfetti: true,
      };
  }
}

// Get theme-aware train type colors
function getThemedTrainTypeColors(trainType: string, themeName: ThemeName): { bg: string; text: string; border: string } {
  if (themeName === "swiss") {
    switch (trainType) {
      case "Bullet": return { bg: "bg-[#EF4444]", text: "text-white", border: "border-transparent" };
      case "Limited": return { bg: "bg-[#F59E0B]", text: "text-[#111827]", border: "border-transparent" };
      default: return { bg: "bg-[#3B82F6]", text: "text-white", border: "border-transparent" };
    }
  }
  if (themeName === "swiss-dark") {
    switch (trainType) {
      case "Bullet": return { bg: "bg-[#F87171]", text: "text-white", border: "border-transparent" };
      case "Limited": return { bg: "bg-[#FBBF24]", text: "text-[#111827]", border: "border-transparent" };
      default: return { bg: "bg-[#60A5FA]", text: "text-white", border: "border-transparent" };
    }
  }
  if (themeName === "obsidian") {
    switch (trainType) {
      case "Bullet": return { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/30" };
      case "Limited": return { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" };
      default: return { bg: "bg-[#5E6AD2]/20", text: "text-[#5E6AD2]", border: "border-[#5E6AD2]/30" };
    }
  }
  if (themeName === "napkin") {
    switch (trainType) {
      case "Bullet": return { bg: "bg-[#ff4d4d]", text: "text-white", border: "border-[#2d2d2d] border-[3px]" };
      case "Limited": return { bg: "bg-[#fff9c4]", text: "text-[#2d2d2d]", border: "border-[#2d2d2d] border-[3px]" };
      default: return { bg: "bg-[#2d5da1]", text: "text-white", border: "border-[#2d2d2d] border-[3px]" };
    }
  }
  if (themeName === "minimalist") {
    switch (trainType) {
      case "Bullet": return { bg: "bg-[#FF3000]", text: "text-white", border: "border-black border-2" };
      case "Limited": return { bg: "bg-black", text: "text-white", border: "border-black border-2" };
      default: return { bg: "bg-[#F2F2F2]", text: "text-black", border: "border-black border-2" };
    }
  }
  // Default: confetti theme
  switch (trainType) {
    case "Bullet": return { bg: "bg-[#F472B6]", text: "text-white", border: "border-[#1E293B] border-2" };
    case "Limited": return { bg: "bg-[#FBBF24]", text: "text-[#1E293B]", border: "border-[#1E293B] border-2" };
    default: return { bg: "bg-[#8B5CF6]", text: "text-white", border: "border-[#1E293B] border-2" };
  }
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

/**
 * Train Position Track - Visual representation of train location on route
 */
interface TrainPositionTrackProps {
  journey: Journey;
  origin: string;
  destination: string;
  isRealtime: boolean;
  themeName: ThemeName;
  stops: StopTimeline[];
  segment?: { from: string; to: string; progress: number } | null;
  liveStatusMessage?: string | null;
}

function TrainPositionTrack({ journey, origin, destination, isRealtime, themeName, stops, segment, liveStatusMessage }: TrainPositionTrackProps) {
  const themeClasses = getThemeClasses(themeName);
  const isSwiss = themeName === "swiss" || themeName === "swiss-dark";
  const isSwissDark = themeName === "swiss-dark";
  const isConfetti = themeName === "confetti";
  const isMinimalist = themeName === "minimalist";
  const isNapkin = themeName === "napkin";
  
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

  // Theme-aware track colors
  const getTrackBg = () => {
    if (isSwiss) return "bg-[#F3F4F6] rounded-full";
    if (isConfetti) return "bg-[#E2E8F0] border-2 border-[#1E293B] rounded-full";
    if (isMinimalist) return "bg-[#F2F2F2] border-2 border-black";
    if (isNapkin) return "bg-[#e5e0d8] border-[3px] border-[#2d2d2d]";
    return "bg-white/[0.06]";
  };
  
  const getProgressBg = () => {
    if (isSwiss) return isSwissDark ? "bg-[#F87171]" : "bg-[#E31837]";
    if (isConfetti) return "bg-gradient-to-r from-[#8B5CF6] via-[#F472B6] to-[#FBBF24]";
    if (isMinimalist) return "bg-black";
    if (isNapkin) return "bg-[#2d2d2d]";
    return "bg-gradient-to-r from-[#5E6AD2] to-[#6872D9]";
  };
  
  const getTrainIconBg = () => {
    if (isSwiss) return isSwissDark ? "#F87171" : "#E31837";
    if (isConfetti) return "#8B5CF6";
    if (isMinimalist) return "#FF3000";
    if (isNapkin) return "#ff4d4d";
    return "#5E6AD2";
  };

  // Station marker component
  const StationMarker = ({ position, label, stationName, time, color }: { 
    position: number; label: string; stationName: string; time: string; color: string;
  }) => {
    const abbr = getStationAbbr(stationName);
    
    return (
      <div className="absolute top-3 flex flex-col items-center transition-all duration-200" style={{ left: `${position}%`, transform: 'translateX(-50%)' }}>
        <div 
          className={`w-5 h-5 ${isConfetti ? "border-2 border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B]" : isNapkin ? "border-[3px] border-[#2d2d2d] shadow-[2px_2px_0px_0px_#2d2d2d]" : isMinimalist ? "border-2 border-black" : ""} ${isMinimalist ? "" : "rounded-full"}`}
          style={{ backgroundColor: color, borderRadius: isMinimalist ? 0 : isNapkin ? SKETCH.wobblySm : undefined }} 
        />
        <div className={`w-0.5 h-4 ${isMinimalist ? "bg-black" : ""}`} style={{ backgroundColor: isMinimalist ? undefined : `${color}66` }} />
        <div className="mt-1 text-center">
          <div className={`text-[10px] font-medium uppercase tracking-wide ${isSwissDark ? "text-[#9CA3AF]" : isSwiss ? "text-[#6B7280]" : isConfetti ? "text-[#64748B] font-bold" : isNapkin ? "text-[#2d2d2d]/60 font-bold" : isMinimalist ? "text-black font-bold tracking-widest text-[9px]" : "text-[#8A8F98]"}`}>{label}</div>
          <div className={`font-semibold text-sm ${isSwissDark ? "text-[#F9FAFB]" : isSwiss ? "text-[#111827]" : isConfetti ? "text-[#1E293B] font-bold" : isNapkin ? "text-[#2d2d2d] font-bold" : isMinimalist ? "text-black font-bold" : "text-gray-100"}`}>{abbr}</div>
          {time && <div className={`text-xs ${isSwissDark ? "text-[#9CA3AF]" : isSwiss ? "text-[#6B7280]" : isConfetti ? "text-[#64748B]" : isNapkin ? "text-[#2d2d2d]/60" : isMinimalist ? "text-[#666666]" : "text-[#8A8F98]"}`}>{time}</div>}
        </div>
      </div>
    );
  };

  // Check if this is a scheduled (non-live) train
  const isScheduledTrain = !isRealtime;

  return (
    <div className={`pt-6 pb-4 border-t ${isSwiss ? "border-[#E5E7EB]" : isConfetti ? "border-t-2 border-[#E2E8F0]" : isMinimalist ? "border-t-2 border-black" : isNapkin ? "border-t-[3px] border-dashed border-[#2d2d2d]/30" : themeClasses.divider}`}>
      <div className="relative h-28 mx-4">
        {/* Track ties */}
        {Array.from({ length: 12 }, (_, i) => (i + 1) * 8).map((pos) => (
          <div key={pos} className={`absolute top-6 w-1 h-3 -translate-y-1/2 ${isSwiss ? "bg-[#E5E7EB] rounded-full" : isConfetti ? "bg-[#1E293B]/20 rounded-full" : isMinimalist ? "bg-black/30" : isNapkin ? "bg-[#2d2d2d]/30" : "bg-gray-600/40"}`} style={{ left: `${pos}%`, transform: 'translateX(-50%) translateY(-50%)', borderRadius: isMinimalist ? 0 : undefined }} />
        ))}
        
        {/* Track line */}
        <div className={`absolute top-6 left-0 right-0 ${isSwiss ? "h-2" : isConfetti ? "h-2.5" : isMinimalist ? "h-2" : "h-1.5"} ${isMinimalist ? "" : "rounded-full"} ${getTrackBg()}`} />
        
        {/* Progress line - only show for live trains */}
        {!isScheduledTrain && (
          <div className={`absolute top-6 left-0 ${isSwiss ? "h-2" : isConfetti ? "h-2.5" : isMinimalist ? "h-2" : "h-1.5"} ${isMinimalist ? "" : "rounded-full"} transition-all duration-700 ${getProgressBg()}`} style={{ width: `${trainPos}%` }} />
        )}
        
        {/* Train icon - only show animated position for live trains */}
        {!isScheduledTrain && (
          <div className="absolute top-6 z-20 transition-all duration-700 ease-out" style={{ left: `${trainPos}%`, transform: 'translateX(-50%) translateY(-50%)' }}>
            <div 
              className={`w-9 h-9 flex items-center justify-center ${isConfetti ? "rounded-full border-2 border-[#1E293B] shadow-[3px_3px_0px_0px_#1E293B] animate-bounce" : isNapkin ? "border-[3px] border-[#2d2d2d] shadow-[3px_3px_0px_0px_#2d2d2d]" : isMinimalist ? "border-2 border-black" : "rounded-full"}`}
              style={{ backgroundColor: getTrainIconBg(), borderRadius: isMinimalist ? 0 : isNapkin ? SKETCH.wobblySm : undefined }}
            >
              <Train className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
          </div>
        )}
        
        {/* Station markers */}
        {prevStationName && <StationMarker position={prevPos} label="Prev" stationName={prevStationName} time="" color={isSwissDark ? "#374151" : isSwiss ? "#E5E7EB" : isConfetti ? "#94a3b8" : isMinimalist ? "#666666" : isNapkin ? "#e5e0d8" : "#6b7280"} />}
        <StationMarker position={boardPos} label="Board" stationName={journey.origin.stopName} time={journey.origin.predictedTime} color={isSwissDark ? "#34D399" : isSwiss ? "#22C55E" : isConfetti ? PLAYFUL.mint : isMinimalist ? "#22C55E" : isNapkin ? "#2d5da1" : "#10b981"} />
        <StationMarker position={exitPos} label="Exit" stationName={destination} time={journey.destination.predictedTime} color={isSwissDark ? "#F87171" : isSwiss ? "#EF4444" : isConfetti ? PLAYFUL.pink : isMinimalist ? "#FF3000" : isNapkin ? "#ff4d4d" : "#f43f5e"} />
      </div>
      
      {/* Live status message */}
      {liveStatusMessage && !isScheduledTrain && (
        <div className={`text-center mt-3 text-xs ${isSwiss ? (isSwissDark ? "text-[#34D399]" : "text-[#22C55E]") + " font-medium" : isConfetti ? "font-bold text-[#34D399]" : isMinimalist ? "text-[#FF3000] font-bold uppercase tracking-widest" : isNapkin ? "text-[#2d5da1] font-bold" : "text-emerald-400"}`}>
          📍 {liveStatusMessage}
        </div>
      )}
      
      {/* Note for scheduled trains */}
      {isScheduledTrain && (
        <div className={`text-center mt-2 text-xs px-4 py-2 mx-4 ${
          isSwiss ? (isSwissDark ? "bg-[#374151] text-[#FBBF24]" : "bg-[#FEF3C7] text-[#92400E]") + " rounded-lg" :
          isConfetti ? "bg-[#FBBF24]/20 text-[#92400E] border-2 border-[#1E293B] rounded-xl" :
          isMinimalist ? "bg-[#F2F2F2] text-[#666666] border-2 border-black font-bold uppercase tracking-wider" :
          isNapkin ? "bg-[#fff9c4] text-[#2d2d2d] border-2 border-[#2d2d2d]" :
          "bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg"
        }`} style={isMinimalist ? { borderRadius: 0 } : isNapkin ? { borderRadius: SKETCH.wobblySm } : undefined}>
          <Clock className="w-3 h-3 inline-block mr-1.5 -mt-0.5" strokeWidth={2} />
          Live tracking available when train departs
        </div>
      )}
    </div>
  );
}


/**
 * Train Card Header Component - Used as the clickable header in accordion
 * This is the collapsed view showing train summary info
 */
interface TrainCardHeaderProps {
  journey: Journey;
  isExpanded: boolean;
  hasETAChanged?: boolean;
  isRealtime: boolean;
  themeName: ThemeName;
  timeFilterMode?: TimeFilterModeOption;
}

function TrainCardHeader({ journey, isExpanded, hasETAChanged, isRealtime, themeName, timeFilterMode }: TrainCardHeaderProps) {
  const colors = getThemedTrainTypeColors(journey.trainType, themeName);
  const themeClasses = getThemeClasses(themeName);
  const isArriving = journey.origin.etaMinutes !== null && journey.origin.etaMinutes <= 5;
  const isSwiss = themeName === "swiss" || themeName === "swiss-dark";
  const isSwissDark = themeName === "swiss-dark";
  const isConfetti = themeName === "confetti";
  const isMinimalist = themeName === "minimalist";
  const isNapkin = themeName === "napkin";
  
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
    
    // Calculate target time based on current ETA
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
  
  // Get accent color for themes
  const getFlatAccentColor = () => {
    if (isSwissDark) {
      switch (journey.trainType) {
        case "Bullet": return "#F87171";
        case "Limited": return "#FBBF24";
        default: return "#60A5FA";
      }
    }
    switch (journey.trainType) {
      case "Bullet": return "#EF4444";
      case "Limited": return "#F59E0B";
      default: return "#3B82F6";
    }
  };
  
  const getPlayfulAccentColor = () => {
    switch (journey.trainType) {
      case "Bullet": return PLAYFUL.pink;
      case "Limited": return PLAYFUL.amber;
      default: return PLAYFUL.violet;
    }
  };
  
  const getSketchAccentColor = () => {
    switch (journey.trainType) {
      case "Bullet": return SKETCH.accent;
      case "Limited": return SKETCH.postit;
      default: return SKETCH.blue;
    }
  };

  // Common header content
  const renderContent = () => (
    <div className="flex items-center justify-between gap-3 w-full">
      <div className="flex items-center gap-3">
        {/* Train icon */}
        <div 
          className={`w-12 h-12 flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
            isConfetti ? 'rounded-xl border-2 border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B]' :
            isMinimalist ? 'border-2 border-black' :
            isNapkin ? 'border-[3px] border-[#2d2d2d] shadow-[3px_3px_0px_0px_#2d2d2d]' :
            isSwiss ? 'rounded-lg' :
            'rounded-lg'
          }`}
          style={{ 
            backgroundColor: isConfetti ? getPlayfulAccentColor() : isNapkin ? getSketchAccentColor() : getFlatAccentColor(),
            borderRadius: isMinimalist ? 0 : isNapkin ? SKETCH.wobblySm : undefined,
            transform: isExpanded ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          <Train className={`w-6 h-6 ${journey.trainType === "Limited" && (isNapkin || isConfetti) ? "text-[#2d2d2d]" : "text-white"}`} strokeWidth={2.5} />
        </div>
        
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-bold text-xl tracking-tight ${
              isSwissDark ? "text-[#F9FAFB]" : 
              isSwiss ? "text-[#111827]" : 
              isConfetti ? "text-[#1E293B]" : 
              isNapkin ? "text-[#2d2d2d] font-[var(--font-kalam)]" :
              isMinimalist ? "text-black" :
              "text-white"
            }`}>
              #{journey.trainNumber}
            </span>
            <span 
              className={`text-xs font-bold px-2.5 py-1 ${
                isConfetti ? 'rounded-full border-2 border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B]' :
                isMinimalist ? 'border-2 border-black uppercase tracking-widest' :
                isNapkin ? 'border-2 border-[#2d2d2d] shadow-[2px_2px_0px_0px_#2d2d2d]' :
                'rounded-md'
              }`}
              style={{ 
                backgroundColor: isConfetti ? getPlayfulAccentColor() : isNapkin ? getSketchAccentColor() : getFlatAccentColor(), 
                color: journey.trainType === "Limited" ? (isSwissDark ? "#111827" : FLAT.foreground) : "white",
                borderRadius: isMinimalist ? 0 : isNapkin ? SKETCH.wobblySm : undefined,
              }}
            >
              {journey.trainType}
            </span>
            {/* Direction indicator */}
            <span 
              className={`text-[10px] font-medium px-2 py-0.5 flex items-center gap-1 ${
                isSwissDark ? "bg-[#374151] text-[#9CA3AF]" :
                isSwiss ? "bg-[#F3F4F6] text-[#6B7280]" :
                isConfetti ? "bg-[#E2E8F0] text-[#64748B] border border-[#1E293B]/20 rounded-full" :
                isNapkin ? "bg-[#e5e0d8] text-[#2d2d2d]/70 border border-[#2d2d2d]/30" :
                isMinimalist ? "bg-[#F2F2F2] text-[#666666] border border-black/20" :
                "bg-white/10 text-white/60"
              }`}
              style={{ borderRadius: isMinimalist ? 0 : isNapkin ? SKETCH.wobblySm : undefined }}
            >
              {journey.direction === 'NB' ? (
                <><ArrowUp className="w-3 h-3" strokeWidth={2.5} />NB</>
              ) : (
                <><ArrowDown className="w-3 h-3" strokeWidth={2.5} />SB</>
              )}
            </span>
            {/* Live vs Scheduled indicator - only show "Scheduled" for fully static data */}
            {journey.isRealtime === false && !journey.isPartialRealtime && (
              <span className={`text-[10px] font-bold px-2 py-0.5 ${
                isSwissDark ? "bg-[#374151] text-[#FBBF24]" :
                isSwiss ? "bg-[#FEF3C7] text-[#92400E]" :
                isConfetti ? "bg-[#FBBF24] text-[#1E293B] border-2 border-[#1E293B] rounded-full" :
                isNapkin ? "bg-[#fff9c4] text-[#2d2d2d] border-2 border-[#2d2d2d]" :
                isMinimalist ? "border-2 border-[#666666] text-[#666666] uppercase tracking-widest" :
                "bg-amber-500/20 text-amber-400"
              }`} style={{ borderRadius: isMinimalist ? 0 : isNapkin ? SKETCH.wobblySm : undefined }}>
                Scheduled
              </span>
            )}
            {/* Best Match badge */}
            {journey.isBestMatch && (
              <span className={`text-[10px] font-bold px-2 py-0.5 ${
                isSwissDark ? "bg-[#34D399] text-white" :
                isSwiss ? "bg-[#22C55E] text-white" :
                isConfetti ? "bg-[#34D399] text-white border-2 border-[#1E293B] rounded-full shadow-[2px_2px_0px_0px_#1E293B]" :
                isNapkin ? "bg-[#2d5da1] text-white border-2 border-[#2d2d2d]" :
                isMinimalist ? "bg-[#FF3000] text-white border-2 border-black" :
                "bg-emerald-500/20 text-emerald-400"
              }`} style={{ borderRadius: isMinimalist ? 0 : isNapkin ? SKETCH.wobblySm : undefined }}>
                ⭐ Best Match
              </span>
            )}
            {/* Minutes before target badge */}
            {hasTimeFilter && journey.minutesBeforeTarget !== undefined && (
              <span className={`text-[10px] font-bold px-2 py-0.5 ${
                isSwissDark ? "bg-[#065F46] text-[#34D399]" :
                isSwiss ? "bg-[#ECFDF5] text-[#059669]" :
                isConfetti ? "bg-[#34D399] text-white border-2 border-[#1E293B] rounded-full" :
                isNapkin ? "bg-[#2d5da1] text-white border-2 border-[#2d2d2d]" :
                isMinimalist ? "bg-[#FF3000] text-white border-2 border-black uppercase tracking-widest" :
                "bg-emerald-500/20 text-emerald-400"
              }`} style={{ borderRadius: isMinimalist ? 0 : isNapkin ? SKETCH.wobblySm : undefined }}>
                {journey.minutesBeforeTarget}m early
              </span>
            )}
          </div>
          <span className={`text-sm ${
            isSwissDark ? "text-[#9CA3AF]" :
            isSwiss ? "text-[#6B7280]" :
            isConfetti ? "text-[#64748B] font-medium" :
            isNapkin ? "text-[#2d2d2d]/60" :
            isMinimalist ? "text-[#666666]" :
            themeClasses.muted
          }`}>
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
                {journey.isRealtime === false && !journey.isPartialRealtime && <Clock className={`w-4 h-4 ${isConfetti ? "text-[#F472B6]" : isNapkin ? "text-[#ff4d4d]" : isMinimalist ? "text-[#666666]" : isSwissDark ? "text-[#FBBF24]" : "text-[#F59E0B]"}`} strokeWidth={2.5} />}
                <span className={`text-3xl font-bold tracking-tight ${
                  isArriving ? (isSwissDark ? "text-[#34D399]" : isSwiss ? "text-[#22C55E]" : isConfetti ? "text-[#34D399]" : isNapkin ? "text-[#2d5da1]" : isMinimalist ? "text-black" : "text-emerald-400") :
                  isLeaveByMode ? (isSwissDark ? "text-[#F87171]" : isSwiss ? "text-[#E31837]" : isConfetti ? "text-[#8B5CF6]" : isNapkin ? "text-[#ff4d4d]" : isMinimalist ? "text-[#FF3000]" : "text-[#5E6AD2]") :
                  (journey.isRealtime === false && !journey.isPartialRealtime) ? (isSwissDark ? "text-[#9CA3AF]" : isSwiss ? "text-[#6B7280]" : isConfetti ? "text-[#64748B]" : isNapkin ? "text-[#2d2d2d]/50" : isMinimalist ? "text-[#666666]" : "text-gray-400") :
                  (isSwissDark ? "text-[#F9FAFB]" : isSwiss ? "text-[#111827]" : isConfetti ? "text-[#1E293B]" : isNapkin ? "text-[#2d2d2d]" : isMinimalist ? "text-black" : "text-white")
                } ${isNapkin ? "font-[var(--font-kalam)]" : ""}`}>
                  {formatDepartureTime(journey.origin.etaMinutes)}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className={`text-xs ${
                  isLeaveByMode ? (isSwissDark ? "text-[#F87171] font-medium" : isSwiss ? "text-[#E31837] font-medium" : isConfetti ? "text-[#8B5CF6]" : isNapkin ? "text-[#ff4d4d] font-bold" : isMinimalist ? "text-[#FF3000] font-bold uppercase tracking-widest" : "text-[#5E6AD2]") :
                  (isSwissDark ? "text-[#9CA3AF]" : isSwiss ? "text-[#6B7280]" : isConfetti ? "text-[#64748B]" : isNapkin ? "text-[#2d2d2d]/60" : isMinimalist ? "text-[#666666]" : themeClasses.muted)
                }`}>
                  {isLeaveByMode ? "Departs " : ""}{journey.origin.predictedTime}
                </span>
                {/* Live countdown for imminent trains */}
                {showCountdown && countdown && (
                  <span className={`text-xs font-mono font-bold px-1.5 py-0.5 animate-pulse ${
                    isSwissDark ? "bg-[#34D399]/20 text-[#34D399]" :
                    isSwiss ? "bg-[#22C55E]/10 text-[#22C55E]" :
                    isConfetti ? "bg-[#34D399]/20 text-[#34D399] border border-[#1E293B]/20 rounded-md" :
                    isNapkin ? "bg-[#2d5da1]/10 text-[#2d5da1]" :
                    isMinimalist ? "bg-[#FF3000]/10 text-[#FF3000]" :
                    "bg-emerald-500/20 text-emerald-400"
                  }`} style={{ borderRadius: isMinimalist ? 0 : undefined }}>
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
                {journey.isRealtime === false && !journey.isPartialRealtime && <Clock className={`w-4 h-4 ${isConfetti ? "text-[#F472B6]" : isNapkin ? "text-[#ff4d4d]" : isMinimalist ? "text-[#666666]" : isSwissDark ? "text-[#FBBF24]" : "text-[#F59E0B]"}`} strokeWidth={2.5} />}
                <span className={`text-3xl font-bold tracking-tight ${
                  (journey.isRealtime === false && !journey.isPartialRealtime) ? (isSwissDark ? "text-[#9CA3AF]" : isSwiss ? "text-[#6B7280]" : isConfetti ? "text-[#64748B]" : isNapkin ? "text-[#2d2d2d]/50" : isMinimalist ? "text-[#666666]" : "text-gray-400") :
                  (isSwissDark ? "text-[#F87171]" : isSwiss ? "text-[#E31837]" : isConfetti ? "text-[#8B5CF6]" : isNapkin ? "text-[#ff4d4d]" : isMinimalist ? "text-[#FF3000]" : "text-[#5E6AD2]")
                } ${isNapkin ? "font-[var(--font-kalam)]" : ""}`}>
                  {journey.destination.predictedTime}
                </span>
              </div>
              <span className={`text-xs font-bold ${isSwissDark ? "text-[#F87171]" : isSwiss ? "text-[#E31837]" : isConfetti ? "text-[#8B5CF6]" : isNapkin ? "text-[#ff4d4d]" : isMinimalist ? "text-[#FF3000] uppercase tracking-widest" : "text-[#5E6AD2]"}`}>
                Arrives
              </span>
              <div className={`text-[10px] mt-0.5 ${isSwissDark ? "text-[#9CA3AF]" : isSwiss ? "text-[#6B7280]" : isConfetti ? "text-[#64748B]" : isNapkin ? "text-[#2d2d2d]/60" : isMinimalist ? "text-[#666666]" : themeClasses.muted}`}>
                Departs {journey.origin.predictedTime}
              </div>
            </>
          )}
        </div>
        
        {/* Expand/Collapse chevron with rotation animation */}
        <div 
          className={`w-8 h-8 flex items-center justify-center transition-all duration-300 ${
            isConfetti ? 'rounded-lg border-2 border-[#1E293B]' :
            isMinimalist ? 'border-2 border-black' :
            isNapkin ? 'border-2 border-[#2d2d2d]' :
            'rounded-full'
          }`}
          style={{ 
            backgroundColor: isExpanded ? (isSwissDark ? 'rgba(248,113,113,0.1)' : isSwiss ? 'rgba(227,24,55,0.1)' : isConfetti ? 'rgba(139,92,246,0.1)' : 'transparent') : 'transparent',
            borderRadius: isMinimalist ? 0 : isNapkin ? SKETCH.wobblySm : undefined,
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <ChevronDown className={`w-5 h-5 ${
            isSwissDark ? "text-[#F87171]" :
            isSwiss ? "text-[#E31837]" :
            isConfetti ? "text-[#8B5CF6]" :
            isNapkin ? "text-[#ff4d4d]" :
            isMinimalist ? "text-[#FF3000]" :
            "text-[#5E6AD2]"
          }`} />
        </div>
      </div>
    </div>
  );

  return renderContent();
}


/**
 * Journey Details Component - The full feature-rich detail view
 * This is shown when a card is expanded
 */
interface JourneyDetailsProps {
  journey: Journey;
  destination: string;
  origin: string;
  isRealtime: boolean;
  themeName: ThemeName;
}

function JourneyDetails({ journey, destination, origin, isRealtime, themeName }: JourneyDetailsProps) {
  const colors = getThemedTrainTypeColors(journey.trainType, themeName);
  const themeClasses = getThemeClasses(themeName);
  const isSwiss = themeName === "swiss" || themeName === "swiss-dark";
  const isSwissDark = themeName === "swiss-dark";
  const isConfetti = themeName === "confetti";
  const isMinimalist = themeName === "minimalist";
  const isNapkin = themeName === "napkin";
  const [showAllStops, setShowAllStops] = useState(false);
  const [stops, setStops] = useState<StopTimeline[]>([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [countdown, setCountdown] = useState<string>("");
  const [segment, setSegment] = useState<{ from: string; to: string; progress: number } | null>(null);
  const lastSegmentRef = useRef<{ from: string; to: string; progress: number } | null>(null);
  
  // Get accent colors
  const getFlatAccentColor = () => {
    if (isSwissDark) {
      switch (journey.trainType) {
        case "Bullet": return "#F87171";
        case "Limited": return "#FBBF24";
        default: return "#60A5FA";
      }
    }
    switch (journey.trainType) {
      case "Bullet": return "#EF4444";
      case "Limited": return "#F59E0B";
      default: return "#3B82F6";
    }
  };
  
  const getPlayfulAccentColor = () => {
    switch (journey.trainType) {
      case "Bullet": return PLAYFUL.pink;
      case "Limited": return PLAYFUL.amber;
      default: return PLAYFUL.violet;
    }
  };

  
  // Live countdown timer
  useEffect(() => {
    if (journey.origin.etaMinutes === null || journey.origin.etaMinutes < 0) {
      setCountdown("");
      return;
    }
    const targetTime = new Date();
    targetTime.setMinutes(targetTime.getMinutes() + journey.origin.etaMinutes);
    
    const updateCountdown = () => {
      const now = new Date();
      const diff = targetTime.getTime() - now.getTime();
      if (diff <= 0) { setCountdown("Now"); return; }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        setCountdown(`${hours}:${(minutes % 60).toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [journey.origin.etaMinutes]);
  
  // Fetch stops
  const fetchStops = useCallback(async () => {
    try {
      const response = await fetch(`/api/trains/${journey.tripId}`);
      const data: TrainDetailsResponse = await response.json();
      if (response.ok && data.trip?.stops) setStops(data.trip.stops);
    } catch (err) { console.error("Failed to fetch stops:", err); }
    finally { setLoadingStops(false); }
  }, [journey.tripId]);
  
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
  
  // Get status
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
  
  const getStatus = () => {
    if (!journeyIsRealtime) return { text: "Scheduled", color: "muted" };
    if (journey.origin.etaMinutes !== null && journey.origin.etaMinutes <= 2) {
      return { text: "Arriving!", color: "success" };
    }
    return { text: "On Time", color: "primary" };
  };
  const status = getStatus();
  
  // All stops in journey order
  const allStops = (() => {
    if (stops.length === 0) return [];
    const originIdx = stops.findIndex(s => s.stopName === origin);
    const destIdx = stops.findIndex(s => s.stopName === destination);
    return originIdx > destIdx ? [...stops].reverse() : stops;
  })();


  // Theme-specific colors
  const flatBg = isSwissDark ? "bg-[#1F2937]" : "bg-white";
  const flatSecondaryBg = isSwissDark ? "bg-[#374151]" : "bg-[#F3F4F6]";
  const flatTextPrimary = isSwissDark ? "text-[#F9FAFB]" : "text-[#111827]";
  const flatTextMuted = isSwissDark ? "text-[#9CA3AF]" : "text-[#6B7280]";
  const flatBorder = isSwissDark ? "border-[#374151]" : "border-[#E5E7EB]";
  const flatAccent = isSwissDark ? "#F87171" : "#E31837";
  const flatSuccess = isSwissDark ? "#34D399" : "#22C55E";
  const flatWarning = isSwissDark ? "#FBBF24" : "#F59E0B";

  return (
    <div className={`${
      isSwiss ? `${flatBg} rounded-lg` :
      isConfetti ? "bg-white border-t-2 border-[#E2E8F0]" :
      isNapkin ? "bg-white border-t-[3px] border-dashed border-[#2d2d2d]/30" :
      isMinimalist ? "bg-white border-t-2 border-black" :
      `${themeClasses.card} border-t`
    } overflow-hidden relative`}>
      
      {/* Stats row */}
      <div className={`flex ${flatSecondaryBg} ${isConfetti ? "gap-3 p-4 border-b-2 border-[#E2E8F0] bg-[#FFFDF5]" : isNapkin ? "gap-3 p-4 border-b-[3px] border-dashed border-[#2d2d2d]/30 bg-[#fdfbf7]" : isMinimalist ? "border-b-2 border-black" : ""}`}>
        <div className={`flex-1 p-3 text-center ${isConfetti ? "flex items-center justify-center gap-2 py-2 px-3 bg-[#8B5CF6] rounded-full border-2 border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B]" : isNapkin ? "flex items-center justify-center gap-2 py-2 px-3 bg-[#2d5da1] border-[3px] border-[#2d2d2d] shadow-[2px_2px_0px_0px_#2d2d2d]" : isMinimalist ? "flex items-center justify-center gap-2 py-3 border-r-2 border-black" : ""}`} style={isNapkin ? { borderRadius: SKETCH.wobblySm } : undefined}>
          <div className={`flex items-center justify-center gap-2 ${!isConfetti && !isNapkin && !isMinimalist ? "" : ""}`}>
            {isSwiss && <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: flatWarning }}><MapPin className="w-4 h-4 text-white" strokeWidth={2} /></div>}
            {isConfetti && <MapPin className="w-4 h-4 text-white" strokeWidth={2.5} />}
            {isNapkin && <MapPin className="w-4 h-4 text-white" strokeWidth={2.5} />}
            {isMinimalist && <MapPin className="w-4 h-4 text-black" strokeWidth={2} />}
            <span className={`text-sm font-medium ${isSwiss ? flatTextPrimary : isConfetti || isNapkin ? "font-bold text-white" : isMinimalist ? "font-bold text-black uppercase tracking-widest text-xs" : ""}`}>{journey.stopsBetween} Stops</span>
          </div>
        </div>
        <div className={`flex-1 p-3 text-center ${isConfetti ? "flex items-center justify-center gap-2 py-2 px-3 bg-[#F472B6] rounded-full border-2 border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B]" : isNapkin ? "flex items-center justify-center gap-2 py-2 px-3 bg-[#ff4d4d] border-[3px] border-[#2d2d2d] shadow-[2px_2px_0px_0px_#2d2d2d]" : isMinimalist ? "flex items-center justify-center gap-2 py-3 border-r-2 border-black" : ""}`} style={isNapkin ? { borderRadius: SKETCH.wobblySm } : undefined}>
          <div className={`flex items-center justify-center gap-2`}>
            {isSwiss && <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: flatAccent }}><Clock className="w-4 h-4 text-white" strokeWidth={2} /></div>}
            {isConfetti && <Clock className="w-4 h-4 text-white" strokeWidth={2.5} />}
            {isNapkin && <Clock className="w-4 h-4 text-white" strokeWidth={2.5} />}
            {isMinimalist && <Clock className="w-4 h-4 text-black" strokeWidth={2} />}
            <span className={`text-sm font-medium ${isSwiss ? flatTextPrimary : isConfetti || isNapkin ? "font-bold text-white" : isMinimalist ? "font-bold text-black uppercase tracking-widest text-xs" : ""}`}>{formatRelativeTime(journey.journeyDuration)}</span>
          </div>
        </div>
        <div className={`flex-1 p-3 text-center ${isConfetti ? `flex items-center justify-center py-2 px-3 rounded-full border-2 border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B] ${journeyIsRealtime ? "bg-[#34D399]" : "bg-[#FBBF24]"}` : isNapkin ? `flex items-center justify-center py-2 px-3 border-[3px] border-[#2d2d2d] shadow-[2px_2px_0px_0px_#2d2d2d] ${journeyIsRealtime ? "bg-[#2d5da1]" : "bg-[#fff9c4]"}` : isMinimalist ? "flex items-center justify-center gap-2 py-3" : ""}`} style={isNapkin ? { borderRadius: SKETCH.wobblySm } : undefined}>
          {isSwiss && <div className={`w-8 h-8 rounded-full flex items-center justify-center`} style={{ backgroundColor: journeyIsRealtime ? flatSuccess : "#6B7280" }}><span className="text-white text-xs font-medium">{journeyIsRealtime ? "●" : "○"}</span></div>}
          <span className={`text-sm font-medium ${isSwiss ? flatTextPrimary : isConfetti ? `font-bold ${journeyIsRealtime ? "text-white" : "text-[#1E293B]"}` : isNapkin ? `font-bold ${journeyIsRealtime ? "text-white" : "text-[#2d2d2d]"}` : isMinimalist ? "font-bold text-black uppercase tracking-widest text-xs" : ""}`}>
            {journeyIsRealtime ? "● Live" : "○ Schedule"}
          </span>
        </div>
      </div>

      {/* Train Position Track - Visual representation of train location */}
      <TrainPositionTrack 
        journey={journey}
        origin={origin}
        destination={destination}
        isRealtime={journeyIsRealtime}
        themeName={themeName}
        stops={stops}
        segment={segment}
        liveStatusMessage={liveStatusMessage}
      />
      
      {/* Show stops button */}
      <button 
        onClick={() => setShowAllStops(!showAllStops)} 
        className={`w-full flex items-center justify-center gap-2 p-3 border-t ${
          isSwiss ? `${flatBorder} ${flatSecondaryBg} ${isSwissDark ? "hover:bg-[#4B5563]" : "hover:bg-[#E5E7EB]"}` :
          isConfetti ? "border-[#E2E8F0] bg-white hover:bg-[#FBBF24]" :
          isNapkin ? "border-[#2d2d2d]/30 border-dashed hover:bg-[#e5e0d8]/50" :
          isMinimalist ? "border-black border-t-2 bg-[#F2F2F2] hover:bg-[#FF3000] hover:text-white" :
          ""
        } transition-all duration-200 text-sm ${
          isSwiss ? flatTextPrimary :
          isConfetti ? "font-bold text-[#1E293B]" :
          isNapkin ? "font-bold text-[#2d2d2d]/70" :
          isMinimalist ? "font-bold text-black uppercase tracking-widest" :
          ""
        }`}
      >
        {showAllStops ? <><ChevronUp className="w-4 h-4" />Hide Stops</> : <><ChevronDown className="w-4 h-4" />Show All {journey.totalStops} Stops</>}
      </button>

      
      {/* Stops list */}
      {showAllStops && (
        <div className={`p-4 border-t ${
          isSwiss ? `${flatBorder} ${flatBg}` :
          isConfetti ? "border-[#E2E8F0] bg-[#FFFDF5]" :
          isNapkin ? "border-[#2d2d2d]/30 border-dashed bg-[#fdfbf7]" :
          isMinimalist ? "border-black border-t-2" :
          ""
        }`}>
          {loadingStops ? (
            <div className={`text-center py-4 ${flatTextMuted}`}>Loading stops...</div>
          ) : allStops.length > 0 ? (
            <div className="space-y-0">
              {allStops.map((stop, idx) => {
                const isOriginStop = stop.stopName === origin;
                const isDestStop = stop.stopName === destination;
                const isPassed = stop.status === 'passed' || stop.status === 'departed';
                const isCurrent = stop.status === 'boarding' || stop.status === 'approaching';
                const isLast = idx === allStops.length - 1;
                
                const stopAccent = isSwissDark ? "#F87171" : "#E31837";
                const stopSuccess = isSwissDark ? "#34D399" : "#22C55E";
                const stopDanger = isSwissDark ? "#F87171" : "#EF4444";
                const stopMuted = isSwissDark ? "#374151" : "#E5E7EB";
                
                return (
                  <div key={stop.stopName} className="flex items-start gap-3 stop-reveal-item" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="flex flex-col items-center">
                      <div 
                        className={`w-4 h-4 rounded-full ${isConfetti || isNapkin ? "border-2 border-[#1E293B] shadow-[1px_1px_0px_0px_#1E293B]" : ""}`}
                        style={{ 
                          backgroundColor: isOriginStop ? stopSuccess : isDestStop ? stopDanger : isPassed ? stopAccent : isCurrent ? stopAccent : stopMuted 
                        }} 
                      />
                      {!isLast && <div className="w-0.5 h-8" style={{ backgroundColor: isPassed ? stopAccent : stopMuted }} />}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium ${isPassed ? (isSwissDark ? 'text-[#F87171]' : 'text-[#E31837]') : isSwiss ? flatTextPrimary : isConfetti ? (isPassed ? 'text-[#8B5CF6]' : 'text-[#1E293B]') : isNapkin ? (isPassed ? 'text-[#ff4d4d]' : 'text-[#2d2d2d]') : isMinimalist ? 'text-black' : ''}`}>
                            {stop.stopName}
                          </span>
                          {isPassed && <span style={{ color: stopAccent }}>✓</span>}
                          {isCurrent && <span className="text-xs px-2 py-0.5 text-white rounded-md font-medium animate-pulse" style={{ backgroundColor: stopAccent }}>Now</span>}
                          {isOriginStop && !isCurrent && <span className="text-xs px-2 py-0.5 text-white rounded-md font-medium" style={{ backgroundColor: stopSuccess }}>Board</span>}
                          {isDestStop && !isCurrent && <span className="text-xs px-2 py-0.5 text-white rounded-md font-medium" style={{ backgroundColor: stopDanger }}>Exit</span>}
                        </div>
                        <div className="text-right">
                          {stop.etaMinutes !== null && !isPassed ? (
                            <span className="font-medium" style={{ color: stop.etaMinutes <= 5 ? stopSuccess : (isSwissDark ? '#F9FAFB' : '#111827') }}>
                              {formatRelativeTime(stop.etaMinutes)}
                            </span>
                          ) : (
                            <span className={`text-sm ${flatTextMuted}`}>{stop.predictedTime}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`text-center py-4 ${flatTextMuted}`}>No stops data available</div>
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
  themeName: ThemeName;
  timeFilterMode?: TimeFilterModeOption;
}

const ExpandableTrainCard = React.forwardRef<HTMLDivElement, ExpandableTrainCardProps>(
  ({ journey, isExpanded, onToggle, origin, destination, isRealtime, hasETAChanged, themeName, timeFilterMode }, ref) => {
    const themeClasses = getThemeClasses(themeName);
    const isSwiss = themeName === "swiss" || themeName === "swiss-dark";
    const isSwissDark = themeName === "swiss-dark";
    const isConfetti = themeName === "confetti";
    const isMinimalist = themeName === "minimalist";
    const isNapkin = themeName === "napkin";
    
    // Get expanded border/shadow styles
    const getExpandedStyles = () => {
      if (isExpanded) {
        if (isSwissDark) return { borderColor: '#F87171', boxShadow: '0 0 0 2px rgba(248,113,113,0.3)' };
        if (isSwiss) return { borderColor: '#E31837', boxShadow: '0 0 0 2px rgba(227,24,55,0.3)' };
        if (isConfetti) return { borderColor: '#8B5CF6', boxShadow: '6px 6px 0px 0px #1E293B' };
        if (isNapkin) return { borderColor: '#ff4d4d', boxShadow: '6px 6px 0px 0px #2d2d2d' };
        if (isMinimalist) return { borderColor: '#FF3000' };
        return { borderColor: '#5E6AD2', boxShadow: '0 0 30px rgba(94,106,210,0.2)' };
      }
      return {};
    };
    
    return (
      <div
        ref={ref}
        className={`transition-all duration-300 overflow-hidden ${
          isSwiss ? 'rounded-lg border' :
          isConfetti ? 'rounded-2xl border-2 border-[#1E293B] shadow-[4px_4px_0px_0px_#1E293B]' :
          isNapkin ? 'border-[3px] border-[#2d2d2d] shadow-[4px_4px_0px_0px_#2d2d2d]' :
          isMinimalist ? 'border-2 border-black' :
          'rounded-xl border'
        } ${isSwissDark ? 'bg-[#1F2937] border-[#374151]' : isSwiss ? 'bg-white border-[#E5E7EB]' : isConfetti ? 'bg-white' : isNapkin ? 'bg-white' : isMinimalist ? 'bg-white' : themeClasses.card}`}
        style={{
          ...getExpandedStyles(),
          borderRadius: isMinimalist ? 0 : isNapkin ? SKETCH.wobblyMd : undefined,
        }}
      >
        {/* Clickable Header */}
        <button
          onClick={onToggle}
          className={`w-full text-left p-4 transition-all duration-200 ${
            isSwiss ? 'hover:bg-[#F3F4F6]' :
            isConfetti ? 'hover:bg-[#FBBF24]/10' :
            isNapkin ? 'hover:bg-[#e5e0d8]/30' :
            isMinimalist ? 'hover:bg-[#F2F2F2]' :
            'hover:bg-white/5'
          }`}
        >
          <TrainCardHeader
            journey={journey}
            isExpanded={isExpanded}
            hasETAChanged={hasETAChanged}
            isRealtime={isRealtime}
            themeName={themeName}
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
            themeName={themeName}
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
  const themeClasses = getThemeClasses(themeName);
  const isSwiss = themeName === "swiss" || themeName === "swiss-dark";
  const isSwissDark = themeName === "swiss-dark";
  const isConfetti = themeName === "confetti";
  const isMinimalist = themeName === "minimalist";
  
  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Accordion state: expandedJourney replaces selectedJourney
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

  
  // Handle accordion toggle - only one card expanded at a time
  const handleToggleExpand = useCallback((journeyId: string) => {
    if (expandedJourney === journeyId) {
      setExpandedJourney(null);
      showFeedback("Collapsed train details");
    } else {
      setExpandedJourney(journeyId);
      const journey = journeys.find(j => j.tripId === journeyId);
      showFeedback(`Viewing Train #${journey?.trainNumber || journeyId}`);
      // Scroll to expanded card after animation starts
      setTimeout(() => {
        expandedCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [expandedJourney, journeys, showFeedback]);
  
  const handleLoadMore = useCallback(() => {
    setVisibleTrainsCount(prev => Math.min(prev + LOAD_MORE_COUNT, journeys.length));
    showFeedback(`Loaded ${LOAD_MORE_COUNT} more trains`);
  }, [journeys.length, showFeedback]);
  
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

  // Load saved preferences
  useEffect(() => {
    const savedOrigin = localStorage.getItem("selectedOrigin");
    const savedDest = localStorage.getItem("selectedDestination");
    if (savedOrigin && stations.find(s => s.stopname === savedOrigin)) setOrigin(savedOrigin);
    else if (stations.find(s => s.stopname === "Sunnyvale")) setOrigin("Sunnyvale");
    else if (stations.length > 0) setOrigin(stations[0].stopname);
    
    if (savedDest && savedDest !== "All" && stations.find(s => s.stopname === savedDest)) setDestination(savedDest);
    else if (stations.find(s => s.stopname === "Palo Alto")) setDestination("Palo Alto");
    else if (stations.find(s => s.stopname === "San Francisco")) setDestination("San Francisco");
    else if (stations.length > 1) setDestination(stations[stations.length - 1].stopname);
  }, []);

  useEffect(() => { if (origin) localStorage.setItem("selectedOrigin", origin); }, [origin]);
  useEffect(() => { if (destination) localStorage.setItem("selectedDestination", destination); }, [destination]);


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
        
        // Keep expanded journey if it still exists
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
    <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} ${theme.typography.fontFamily}`}>
      <ActionFeedback message={feedbackMessage} visible={feedbackVisible} themeName={themeName} />
      
      <div className="max-w-3xl mx-auto p-4 lg:p-6">
        {/* Header */}
        <div className={`flex items-center justify-between mb-6 relative ${isSwiss ? (isSwissDark ? "pb-6 border-b border-[#F87171]/20" : "pb-6 border-b border-[#E31837]/20") : isConfetti ? "pb-6 border-b-2 border-[#E2E8F0]" : themeName === "napkin" ? "pb-6 border-b-[3px] border-dashed border-[#2d2d2d]/30" : isMinimalist ? "pb-6 border-b-4 border-black" : ""}`}>
          {isSwiss && <div className={`absolute -top-4 -left-4 w-24 h-24 ${isSwissDark ? "bg-[#F87171]/5" : "bg-[#E31837]/5"} rounded-full blur-2xl pointer-events-none`} />}
          <div className="flex items-center gap-3 relative">
            {/* Logo */}
            {isSwiss ? (
              <div className={`flex items-center gap-0.5 p-2 ${isSwissDark ? "bg-[#1F2937]" : "bg-white"} rounded-lg ${isSwissDark ? "" : "shadow-sm"}`}>
                <div className={`w-2.5 h-9 ${isSwissDark ? "bg-[#F87171]" : "bg-[#E31837]"} rounded-sm`} />
                <div className={`w-2.5 h-7 ${isSwissDark ? "bg-[#34D399]" : "bg-[#10B981]"} rounded-sm`} />
                <div className={`w-2.5 h-5 ${isSwissDark ? "bg-[#FBBF24]" : "bg-[#F59E0B]"} rounded-sm`} />
              </div>
            ) : isConfetti ? (
              <div className="flex items-center gap-1">
                <div className="w-3 h-10 bg-[#8B5CF6] border-2 border-[#1E293B] rounded-full shadow-[2px_2px_0px_0px_#1E293B]" />
                <div className="w-3 h-7 bg-[#F472B6] border-2 border-[#1E293B] rounded-full shadow-[2px_2px_0px_0px_#1E293B]" />
                <div className="w-3 h-4 bg-[#FBBF24] border-2 border-[#1E293B] rounded-full shadow-[2px_2px_0px_0px_#1E293B]" />
              </div>
            ) : themeName === "napkin" ? (
              <div className="flex items-center gap-1 p-2 bg-white border-[3px] border-[#2d2d2d] shadow-[3px_3px_0px_0px_#2d2d2d] rotate-[-2deg]" style={{ borderRadius: SKETCH.wobblySm }}>
                <div className="w-3 h-10 bg-[#ff4d4d] border-2 border-[#2d2d2d]" style={{ borderRadius: "20px 4px 22px 3px / 4px 20px 3px 22px" }} />
                <div className="w-3 h-7 bg-[#2d5da1] border-2 border-[#2d2d2d]" style={{ borderRadius: "18px 5px 20px 4px / 5px 18px 4px 20px" }} />
                <div className="w-3 h-4 bg-[#fff9c4] border-2 border-[#2d2d2d]" style={{ borderRadius: "15px 3px 17px 4px / 3px 15px 4px 17px" }} />
              </div>
            ) : isMinimalist ? (
              <div className="flex items-center gap-1">
                <div className="w-3 h-10 bg-black" />
                <div className="w-3 h-7 bg-[#FF3000]" />
                <div className="w-3 h-4 bg-[#F2F2F2] border-2 border-black" />
              </div>
            ) : (
              <div className="flex items-center gap-0.5">
                <div className={`w-1.5 h-7 ${themeClasses.accent.replace('text-', 'bg-')} rounded-full opacity-90`} />
                <div className={`w-1.5 h-5 ${themeClasses.accent.replace('text-', 'bg-')} rounded-full opacity-60`} />
                <div className={`w-1.5 h-3 ${themeClasses.accent.replace('text-', 'bg-')} rounded-full opacity-30`} />
              </div>
            )}
            <div>
              <h1 className={`text-xl lg:text-2xl font-bold tracking-tight ${isSwiss ? (isSwissDark ? "text-2xl lg:text-3xl font-bold text-[#F9FAFB]" : "text-2xl lg:text-3xl font-bold text-[#111827]") : isConfetti ? "text-2xl lg:text-3xl font-bold text-[#1E293B]" : themeName === "napkin" ? "text-2xl lg:text-3xl font-bold text-[#2d2d2d] font-[var(--font-kalam)]" : isMinimalist ? "text-3xl lg:text-4xl font-black text-black uppercase tracking-tight" : "text-white"}`}>
                {theme.typography.logoText}
              </h1>
              <p className={`text-[11px] ${themeClasses.muted}`}>Caltrain Tracker</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              {dataSource && <LiveStatusBadge dataSource={dataSource} size="sm" />}
              <JourneyThemeSwitcher />
              <ServiceAlertsBanner />
            </div>
            {lastUpdated && <span className={`text-[9px] ${themeClasses.muted}`}>Last updated at {lastUpdated.toLocaleTimeString()}</span>}
          </div>
        </div>


        {/* Route Selection */}
        <div className={`${isSwiss ? (isSwissDark ? "bg-[#1F2937] rounded-xl border border-[#374151]" : "bg-white rounded-xl shadow-sm border border-[#E5E7EB]") : isConfetti ? "bg-white border-2 border-[#1E293B] rounded-2xl shadow-[6px_6px_0px_0px_#E2E8F0]" : themeName === "napkin" ? "bg-white border-[3px] border-[#2d2d2d] shadow-[6px_6px_0px_0px_#2d2d2d]" : isMinimalist ? "bg-white border-4 border-black" : `${themeClasses.card} rounded-2xl border backdrop-blur-sm`} p-4 mb-6 relative overflow-hidden`} style={themeName === "napkin" ? { borderRadius: SKETCH.wobblyMd } : isMinimalist ? { borderRadius: 0 } : undefined}>
          {isSwiss && <div className="absolute top-0 left-0 w-1.5 h-full bg-[#E31837] rounded-l-xl" />}
          {isMinimalist && <div className="absolute top-0 left-0 w-2 h-full bg-[#FF3000]" />}
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 lg:gap-4 relative">
            <div className="flex-1 min-w-0">
              <label className={`text-[10px] ${themeClasses.muted} uppercase tracking-widest font-medium mb-1.5 block`}>From</label>
              <Select value={origin} onValueChange={(v) => { setOrigin(v); setExpandedJourney(null); }}>
                <SelectTrigger className={`w-full ${isSwiss ? "h-11 bg-white border-2 border-[#E5E7EB] text-[#111827] font-medium rounded-md" : isConfetti ? "h-11 border-2 border-[#1E293B] bg-white text-[#1E293B] font-medium rounded-xl shadow-[3px_3px_0px_0px_#1E293B]" : isMinimalist ? "h-11 bg-white border-2 border-black text-black font-bold rounded-none" : `${themeClasses.input} text-sm h-9`}`} style={isMinimalist ? { borderRadius: 0 } : undefined}>
                  <SelectValue placeholder="Origin" />
                </SelectTrigger>
                <SelectContent className={`${isSwiss ? "bg-white border-2 border-[#E5E7EB] rounded-md" : isConfetti ? "bg-white border-2 border-[#1E293B] rounded-xl" : isMinimalist ? "bg-white border-4 border-black rounded-none" : "bg-gray-800 border-gray-700"}`} style={isMinimalist ? { borderRadius: 0 } : undefined}>
                  {stations.map((s) => (
                    <SelectItem key={s.stop1} value={s.stopname} disabled={s.stopname === destination}>{s.stopname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <button onClick={handleSwap} className={`self-center sm:self-auto flex-shrink-0 ${isSwiss ? "w-11 h-11 bg-[#E31837] rounded-md hover:bg-[#C41230]" : isConfetti ? "w-11 h-11 bg-[#F472B6] border-2 border-[#1E293B] rounded-full shadow-[3px_3px_0px_0px_#1E293B]" : isMinimalist ? "w-11 h-11 bg-black text-white border-2 border-black hover:bg-[#FF3000]" : `p-2.5 rounded-xl ${themeClasses.card} border`} transition-all hover:scale-105 flex items-center justify-center`} style={isMinimalist ? { borderRadius: 0 } : undefined} aria-label="Swap stations">
              <ArrowLeftRight className={`w-4 h-4 ${isSwiss || isConfetti || isMinimalist ? "text-white" : themeClasses.muted}`} />
            </button>
            
            <div className="flex-1 min-w-0">
              <label className={`text-[10px] ${themeClasses.muted} uppercase tracking-widest font-medium mb-1.5 block`}>To</label>
              <Select value={destination} onValueChange={(v) => { setDestination(v); setExpandedJourney(null); }}>
                <SelectTrigger className={`w-full ${isSwiss ? "h-11 bg-white border-2 border-[#E5E7EB] text-[#111827] font-medium rounded-md" : isConfetti ? "h-11 border-2 border-[#1E293B] bg-white text-[#1E293B] font-medium rounded-xl shadow-[3px_3px_0px_0px_#1E293B]" : isMinimalist ? "h-11 bg-white border-2 border-black text-black font-bold rounded-none" : `${themeClasses.input} text-sm h-9`}`} style={isMinimalist ? { borderRadius: 0 } : undefined}>
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent className={`${isSwiss ? "bg-white border-2 border-[#E5E7EB] rounded-md" : isConfetti ? "bg-white border-2 border-[#1E293B] rounded-xl" : isMinimalist ? "bg-white border-4 border-black rounded-none" : "bg-gray-800 border-gray-700"}`} style={isMinimalist ? { borderRadius: 0 } : undefined}>
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
            themeName={themeName}
            showFeedback={showFeedback}
          />
          
          {/* Time Filter Controls */}
          <div className={`mt-4 pt-4 border-t ${isSwiss ? "border-[#E31837]/20" : isConfetti ? "border-[#E2E8F0]" : isMinimalist ? "border-black border-t-2" : "border-white/[0.06]"}`}>
            <div className="flex flex-wrap items-center gap-4">
              <TimeFilterSelector value={timeFilterMode} onChange={(mode) => { setTimeFilterMode(mode); setExpandedJourney(null); }} themeName={themeName} />
              {timeFilterMode !== 'depart_now' && <TimePicker value={targetTime} onChange={(time) => { setTargetTime(time); setExpandedJourney(null); }} themeName={themeName} />}
              
              {/* Train Type Filter Badges */}
              <div className="flex items-center gap-2 ml-auto">
                <span className={`text-xs ${themeClasses.muted} mr-1`}>Show:</span>
                {(['Local', 'Limited', 'Bullet'] as const).map((trainType) => {
                  const isEnabled = trainTypeFilters[trainType];
                  const getColors = () => {
                    if (isSwiss) {
                      switch (trainType) {
                        case 'Bullet': return { active: 'bg-[#EF4444] text-white', inactive: 'bg-[#F3F4F6] text-[#6B7280]' };
                        case 'Limited': return { active: 'bg-[#F59E0B] text-[#111827]', inactive: 'bg-[#F3F4F6] text-[#6B7280]' };
                        default: return { active: 'bg-[#3B82F6] text-white', inactive: 'bg-[#F3F4F6] text-[#6B7280]' };
                      }
                    }
                    if (isConfetti) {
                      switch (trainType) {
                        case 'Bullet': return { active: 'bg-[#F472B6] text-white border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B]', inactive: 'bg-white text-[#64748B] border-[#E2E8F0]' };
                        case 'Limited': return { active: 'bg-[#FBBF24] text-[#1E293B] border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B]', inactive: 'bg-white text-[#64748B] border-[#E2E8F0]' };
                        default: return { active: 'bg-[#8B5CF6] text-white border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B]', inactive: 'bg-white text-[#64748B] border-[#E2E8F0]' };
                      }
                    }
                    if (isMinimalist) {
                      switch (trainType) {
                        case 'Bullet': return { active: 'bg-[#FF3000] text-white border-black', inactive: 'bg-white text-[#666666] border-black' };
                        case 'Limited': return { active: 'bg-black text-white border-black', inactive: 'bg-white text-[#666666] border-black' };
                        default: return { active: 'bg-[#F2F2F2] text-black border-black', inactive: 'bg-white text-[#666666] border-black' };
                      }
                    }
                    switch (trainType) {
                      case 'Bullet': return { active: 'bg-rose-500/30 text-rose-400 border-rose-500/50', inactive: 'bg-white/5 text-white/40 border-white/10' };
                      case 'Limited': return { active: 'bg-amber-500/30 text-amber-400 border-amber-500/50', inactive: 'bg-white/5 text-white/40 border-white/10' };
                      default: return { active: 'bg-blue-500/30 text-blue-400 border-blue-500/50', inactive: 'bg-white/5 text-white/40 border-white/10' };
                    }
                  };
                  const typeColors = getColors();
                  return (
                    <button key={trainType} onClick={() => toggleTrainType(trainType)} className={`px-3 py-1.5 text-xs font-medium border transition-all duration-150 ${isEnabled ? typeColors.active : typeColors.inactive} ${isConfetti ? 'border-2 font-bold rounded-full' : isMinimalist ? 'border-2 uppercase tracking-widest font-bold' : 'rounded-full'} ${!isEnabled ? 'opacity-60' : ''}`} style={isMinimalist ? { borderRadius: 0 } : undefined}>
                      {trainType}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>


        {/* Loading State */}
        {loading && journeys.length === 0 && (
          <div className={`text-center py-8 ${themeClasses.muted} ${isSwiss ? (isSwissDark ? "bg-[#374151] rounded-lg" : "bg-[#F3F4F6] rounded-lg") : isConfetti ? "bg-white border-2 border-[#1E293B] rounded-2xl shadow-[6px_6px_0px_0px_#E2E8F0]" : isMinimalist ? "bg-white border-2 border-black" : ""}`} style={isMinimalist ? { borderRadius: 0 } : undefined}>
            <RefreshCw className={`w-6 h-6 animate-spin mx-auto mb-2 ${isSwiss ? (isSwissDark ? "text-[#F87171]" : "text-[#E31837]") : isConfetti ? "text-[#8B5CF6]" : isMinimalist ? "text-[#FF3000]" : ""}`} />
            <span>Finding trains...</span>
          </div>
        )}

        {/* Error Message */}
        {fetchError && !loading && (
          <div className={`text-center py-6 px-4 ${isSwiss ? "bg-[#FEF2F2] rounded-lg" : isConfetti ? "bg-white border-2 border-[#F472B6] rounded-2xl" : isMinimalist ? "bg-white border-2 border-black" : "bg-rose-500/10 border border-rose-500/20 rounded-xl"}`} style={isMinimalist ? { borderRadius: 0 } : undefined}>
            <div className="text-2xl mb-2">🚂</div>
            <p className={`font-medium mb-1 ${isSwiss ? "text-[#991B1B]" : isConfetti ? "text-[#1E293B] font-bold" : "text-rose-400"}`}>Connection hiccup</p>
            <p className={`text-sm mb-4 ${isSwiss ? "text-[#B91C1C]" : isConfetti ? "text-[#64748B]" : "text-rose-300/80"}`}>{fetchError}</p>
            <button onClick={() => { setFetchError(null); fetchJourneys(); }} className={`text-sm px-4 py-2 ${isSwiss ? "bg-[#E31837] text-white font-medium rounded-md" : isConfetti ? "bg-[#8B5CF6] border-2 border-[#1E293B] rounded-full font-bold text-white" : "bg-white/10 text-white rounded-lg"} transition-all`}>
              Try again
            </button>
          </div>
        )}

        {/* No Trains */}
        {!loading && origin && destination && origin !== destination && journeys.length === 0 && (
          <div className={`text-center py-8 ${isSwiss ? "bg-[#F3F4F6] rounded-lg p-6" : isConfetti ? "bg-white border-2 border-[#1E293B] rounded-2xl p-6" : `${themeClasses.card} rounded-xl border p-6`} ${themeClasses.muted}`}>
            <Train className={`w-8 h-8 mx-auto mb-2 opacity-50`} />
            <p className={isSwiss ? "font-semibold text-[#111827]" : isConfetti ? "font-bold text-[#1E293B]" : ""}>No trains found for this route</p>
            <button onClick={handleSwap} className={`mt-3 text-xs px-3 py-1.5 ${isSwiss ? "bg-[#E31837] text-white font-medium rounded-md" : isConfetti ? "bg-[#FBBF24] border-2 border-[#1E293B] rounded-full font-bold text-[#1E293B]" : `rounded ${themeClasses.card} border`} transition-all`}>
              Try {destination} → {origin} instead
            </button>
          </div>
        )}


        {/* Main Content - Single Column Full Width Accordion */}
        {journeys.length > 0 && (
          <div className="space-y-3">
            {/* Section header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {isSwiss && <div className="w-1.5 h-5 bg-gradient-to-b from-[#E31837] to-[#22C55E] rounded-full" />}
                {isConfetti && <div className="w-2 h-5 bg-[#8B5CF6] border border-[#1E293B] rounded-full shadow-[1px_1px_0px_0px_#1E293B]" />}
                {isMinimalist && <div className="w-1 h-6 bg-[#FF3000]" />}
                <h2 className={`text-sm font-semibold ${isSwiss ? (isSwissDark ? "text-lg font-bold text-[#F9FAFB]" : "text-lg font-bold text-[#111827]") : isConfetti ? "text-lg font-bold text-[#1E293B]" : isMinimalist ? "text-lg font-black text-black uppercase tracking-wider" : "text-gray-300"} tracking-wide`}>
                  Departures
                </h2>
              </div>
              <span className={`text-xs ${themeClasses.muted}`}>
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
                themeName={themeName}
                timeFilterMode={timeFilterMode}
              />
            ))}
            
            {/* Load more button */}
            {hasMoreTrains && (
              <button onClick={handleLoadMore} className={`w-full text-center text-xs ${themeClasses.muted} py-2 flex items-center justify-center gap-1 ${isSwiss ? "bg-[#F3F4F6] text-[#111827] font-medium rounded-md py-2.5" : isConfetti ? "bg-white border-2 border-[#1E293B] rounded-full font-bold text-[#1E293B] shadow-[3px_3px_0px_0px_#1E293B] py-2.5" : isMinimalist ? "bg-[#F2F2F2] text-black font-bold uppercase tracking-widest border-2 border-black py-2.5" : ""}`} style={isMinimalist ? { borderRadius: 0 } : undefined}>
                <ChevronDown className="w-3 h-3" />
                <span>Show {Math.min(LOAD_MORE_COUNT, remainingCount)} more train{Math.min(LOAD_MORE_COUNT, remainingCount) !== 1 ? "s" : ""}</span>
                <span className={`ml-1 opacity-60`}>({remainingCount} remaining)</span>
              </button>
            )}
            
            {!hasMoreTrains && journeys.length > INITIAL_TRAINS_COUNT && (
              <div className={`text-center py-2 text-xs ${themeClasses.muted}`}>All {filteredJourneys.length} trains loaded</div>
            )}
          </div>
        )}

        <div className={`text-center text-[10px] ${themeClasses.muted} pt-6 mt-4 ${isSwiss ? "border-t border-[#E5E7EB] font-medium" : isConfetti ? "border-t-2 border-[#E2E8F0] font-medium" : ""}`}>
          <span className={isSwiss ? "text-[#E31837]" : isConfetti ? "text-[#8B5CF6]" : themeClasses.accent}>●</span> Auto-refreshes every 30 seconds
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
