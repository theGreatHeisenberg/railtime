"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Train,
  Clock,
  MapPin,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Share2,
  RefreshCw,
  Check,
  ExternalLink,
} from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { ThemeName } from "@/lib/themes";
import {
  TrainDetailsResponse,
  StopTimeline,
  TrainType,
  Direction,
} from "@/lib/types";
import JourneyThemeSwitcher from "@/components/JourneyThemeSwitcher";
import Footer from "@/components/Footer";

// Station abbreviations
const STATION_ABBREVIATIONS: Record<string, string> = {
  "San Francisco": "SF", "22nd Street": "22S", "Bayshore": "BAY",
  "South San Francisco": "SSF", "San Bruno": "SBR", "Millbrae": "MB",
  "Broadway": "BWY", "Burlingame": "BUR", "San Mateo": "SM",
  "Hayward Park": "HWP", "Hillsdale": "HS", "Belmont": "BEL",
  "San Carlos": "SC", "Redwood City": "RWC", "Menlo Park": "MP",
  "Palo Alto": "PA", "California Avenue": "Cal", "San Antonio": "SA",
  "Mountain View": "MV", "Sunnyvale": "SV", "Lawrence": "LAW",
  "Santa Clara": "SCL", "College Park": "CP", "San Jose Diridon": "SJ",
  "Tamien": "TAM", "Capitol": "CAP", "Blossom Hill": "BH",
  "Morgan Hill": "MH", "San Martin": "SMR", "Gilroy": "GIL",
};

function getStationAbbr(name: string): string {
  return STATION_ABBREVIATIONS[name] || name.substring(0, 3).toUpperCase();
}

// Theme classes helper
function getThemeClasses(themeName: ThemeName) {
  switch (themeName) {
    case "swiss":
      return {
        bg: "bg-[#FAFAFA]", text: "text-[#111827]", card: "bg-white border-[#E5E7EB]",
        muted: "text-[#6B7280]", accent: "#E31837", accentText: "text-[#E31837]",
        success: "#22C55E", cardBg: "bg-[#F9FAFB]",
      };
    case "swiss-dark":
      return {
        bg: "bg-[#111827]", text: "text-[#F9FAFB]", card: "bg-[#1F2937] border-[#374151]",
        muted: "text-[#9CA3AF]", accent: "#F87171", accentText: "text-[#F87171]",
        success: "#34D399", cardBg: "bg-[#374151]",
      };
    case "confetti":
      return {
        bg: "bg-[#FFFDF5]", text: "text-[#1E293B]", card: "bg-white border-[#1E293B] border-2",
        muted: "text-[#64748B]", accent: "#8B5CF6", accentText: "text-[#8B5CF6]",
        success: "#34D399", cardBg: "bg-[#FFFDF5]",
      };
    case "minimalist":
      return {
        bg: "bg-white", text: "text-black", card: "bg-white border-black border-2",
        muted: "text-[#666666]", accent: "#FF3000", accentText: "text-[#FF3000]",
        success: "#22C55E", cardBg: "bg-[#F2F2F2]",
      };
    case "napkin":
      return {
        bg: "bg-[#fdfbf7]", text: "text-[#2d2d2d]", card: "bg-white border-[#2d2d2d] border-[3px]",
        muted: "text-[#2d2d2d]/60", accent: "#ff4d4d", accentText: "text-[#ff4d4d]",
        success: "#2d5da1", cardBg: "bg-[#fdfbf7]",
      };
    default: // obsidian
      return {
        bg: "bg-[#050506]", text: "text-[#EDEDEF]", card: "bg-white/[0.05] border-white/[0.1]",
        muted: "text-[#8A8F98]", accent: "#5E6AD2", accentText: "text-[#5E6AD2]",
        success: "#34D399", cardBg: "bg-white/[0.03]",
      };
  }
}

// Train type colors
function getTrainTypeColor(trainType: TrainType, themeName: ThemeName): string {
  const isDark = themeName === "swiss-dark" || themeName === "obsidian";
  switch (trainType) {
    case "Bullet": return isDark ? "#F87171" : "#EF4444";
    case "Limited": return isDark ? "#FBBF24" : "#F59E0B";
    default: return isDark ? "#60A5FA" : "#3B82F6";
  }
}

// Format time helpers
function formatRelativeTime(minutes: number | null): string {
  if (minutes === null || minutes < 0) return "--";
  if (minutes === 0) return "Now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default function TrainDetailPage() {
  const params = useParams();
  const trainId = params.trainId as string;
  const { theme, themeName } = useTheme();
  const themeClasses = getThemeClasses(themeName);
  
  const [trainData, setTrainData] = useState<TrainDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Fetch train details
  const fetchTrainDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/trains/${trainId}`);
      const data: TrainDetailsResponse = await response.json();
      
      if (response.ok && data.trip) {
        setTrainData(data);
        setLastUpdated(new Date());
        setError(null);
      } else {
        setError("Train not found");
      }
    } catch (err) {
      setError("Failed to load train details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [trainId]);
  
  useEffect(() => {
    fetchTrainDetails();
    const interval = setInterval(fetchTrainDetails, 15000);
    return () => clearInterval(interval);
  }, [fetchTrainDetails]);
  

  
  // Copy share link
  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const trip = trainData?.trip;
  const trainType = trip?.trainType || "Local";
  const direction = trip?.direction || "SB";
  const trainColor = getTrainTypeColor(trainType as TrainType, themeName);
  
  // Find current/next stop (approaching = train is arriving at this station)
  const currentStop = trip?.stops?.find(s => s.status === "approaching");
  const nextStop = trip?.stops?.find(s => s.status === "scheduled");
  const passedStops = trip?.stops?.filter(s => s.status === "passed" || s.status === "departed") || [];
  const upcomingStops = trip?.stops?.filter(s => s.status === "scheduled" || s.status === "approaching") || [];

  return (
    <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} ${theme.typography.fontFamily}`}>
      <div className="max-w-2xl mx-auto p-4 lg:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            href="/"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${themeClasses.card} border hover:opacity-80`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <JourneyThemeSwitcher />
            <button
              onClick={handleShare}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${themeClasses.card} border hover:opacity-80`}
            >
              {copied ? (
                <><Check className="w-4 h-4" style={{ color: themeClasses.success }} /><span className="text-sm">Copied!</span></>
              ) : (
                <><Share2 className="w-4 h-4" /><span className="text-sm">Share</span></>
              )}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className={`text-center py-16 ${themeClasses.card} rounded-xl border`}>
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: themeClasses.accent }} />
            <p className={themeClasses.muted}>Loading train #{trainId}...</p>
          </div>
        )}
        
        {/* Error State */}
        {error && !loading && (
          <div className={`text-center py-16 ${themeClasses.card} rounded-xl border`}>
            <Train className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium mb-2">{error}</p>
            <p className={`text-sm ${themeClasses.muted} mb-4`}>
              Train #{trainId} may have completed its journey or hasn't started yet.
            </p>
            <Link 
              href="/"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all`}
              style={{ backgroundColor: themeClasses.accent, color: "white" }}
            >
              <ArrowLeft className="w-4 h-4" />
              Find another train
            </Link>
          </div>
        )}
        
        {/* Train Details */}
        {trip && !loading && (
          <>
            {/* Train Header Card */}
            <div className={`${themeClasses.card} rounded-xl border p-6 mb-4`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: trainColor }}
                  >
                    <Train className="w-8 h-8 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-3xl font-bold">#{trip.trainNumber}</h1>
                      <span 
                        className="px-3 py-1 rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: trainColor }}
                      >
                        {trainType}
                      </span>
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${themeClasses.cardBg}`}>
                        {direction === "NB" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {direction === "NB" ? "Northbound" : "Southbound"}
                      </span>
                    </div>
                    <p className={themeClasses.muted}>
                      {trip.stops?.length || 0} stops total
                    </p>
                  </div>
                </div>
                
                {lastUpdated && (
                  <div className={`text-right text-xs ${themeClasses.muted}`}>
                    <RefreshCw className="w-3 h-3 inline-block mr-1" />
                    Updated {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
              </div>
              
              {/* Current Status */}
              {currentStop && (
                <div 
                  className="p-4 rounded-lg mb-4"
                  style={{ backgroundColor: `${themeClasses.success}20` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: themeClasses.success }}>
                        Approaching
                      </p>
                      <p className="text-xl font-bold">{currentStop.stopName}</p>
                    </div>
                    {currentStop.etaMinutes !== null && currentStop.etaMinutes >= 0 && (
                      <div className="text-right">
                        <p className="text-3xl font-bold" style={{ color: themeClasses.success }}>
                          {formatRelativeTime(currentStop.etaMinutes)}
                        </p>
                        <p className={`text-xs ${themeClasses.muted}`}>{currentStop.predictedTime}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Next Stop (if no current) */}
              {!currentStop && nextStop && (
                <div className={`p-4 rounded-lg ${themeClasses.cardBg}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${themeClasses.muted}`}>
                        Next Stop
                      </p>
                      <p className="text-xl font-bold">{nextStop.stopName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color: themeClasses.accent }}>
                        {formatRelativeTime(nextStop.etaMinutes)}
                      </p>
                      <p className={`text-xs ${themeClasses.muted}`}>{nextStop.predictedTime}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Journey Progress */}
            <div className={`${themeClasses.card} rounded-xl border p-6 mb-4`}>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" style={{ color: themeClasses.accent }} />
                Journey Progress
              </h2>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <div className={`h-2 rounded-full ${themeClasses.cardBg} overflow-hidden`}>
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${trip.stops ? (passedStops.length / trip.stops.length) * 100 : 0}%`,
                        backgroundColor: themeClasses.accent 
                      }}
                    />
                  </div>
                </div>
                <span className={`text-sm font-medium ${themeClasses.muted}`}>
                  {passedStops.length}/{trip.stops?.length || 0} stops
                </span>
              </div>
              
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4">
                <div className={`p-3 rounded-lg text-center ${themeClasses.cardBg}`}>
                  <p className="text-2xl font-bold" style={{ color: themeClasses.success }}>
                    {passedStops.length}
                  </p>
                  <p className={`text-xs ${themeClasses.muted}`}>Completed</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${themeClasses.cardBg}`}>
                  <p className="text-2xl font-bold" style={{ color: themeClasses.accent }}>
                    {currentStop ? 1 : 0}
                  </p>
                  <p className={`text-xs ${themeClasses.muted}`}>Current</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${themeClasses.cardBg}`}>
                  <p className="text-2xl font-bold">
                    {upcomingStops.length}
                  </p>
                  <p className={`text-xs ${themeClasses.muted}`}>Remaining</p>
                </div>
              </div>
            </div>
            
            {/* All Stops Timeline */}
            <div className={`${themeClasses.card} rounded-xl border p-6`}>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" style={{ color: themeClasses.accent }} />
                All Stops
              </h2>
              
              <div className="space-y-0">
                {trip.stops?.map((stop, idx) => {
                  const isPassed = stop.status === "passed" || stop.status === "departed";
                  const isCurrent = stop.status === "approaching";
                  const isLast = idx === (trip.stops?.length || 0) - 1;
                  
                  return (
                    <div key={stop.stopName} className="flex items-start gap-4">
                      {/* Timeline */}
                      <div className="flex flex-col items-center">
                        <div 
                          className={`w-4 h-4 rounded-full border-2 ${isCurrent ? "animate-pulse" : ""}`}
                          style={{ 
                            backgroundColor: isPassed || isCurrent ? themeClasses.accent : "transparent",
                            borderColor: themeClasses.accent,
                          }}
                        />
                        {!isLast && (
                          <div 
                            className="w-0.5 h-12"
                            style={{ backgroundColor: isPassed ? themeClasses.accent : `${themeClasses.accent}30` }}
                          />
                        )}
                      </div>
                      
                      {/* Stop Info */}
                      <div className={`flex-1 pb-4 ${isPassed ? "opacity-60" : ""}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${isCurrent ? "text-lg" : ""}`}>
                              {stop.stopName}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${themeClasses.cardBg} ${themeClasses.muted}`}>
                              {getStationAbbr(stop.stopName)}
                            </span>
                            {isPassed && (
                              <Check className="w-4 h-4" style={{ color: themeClasses.success }} />
                            )}
                            {isCurrent && (
                              <span 
                                className="text-xs px-2 py-0.5 rounded-full text-white font-medium animate-pulse"
                                style={{ backgroundColor: themeClasses.accent }}
                              >
                                Approaching
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            {!isPassed && stop.etaMinutes !== null && stop.etaMinutes >= 0 ? (
                              <div className="flex flex-col items-end">
                                <span className="font-medium" style={{ color: isCurrent ? themeClasses.success : undefined }}>
                                  {formatRelativeTime(stop.etaMinutes)}
                                </span>
                                <span className={`text-xs ${themeClasses.muted}`}>{stop.predictedTime}</span>
                              </div>
                            ) : (
                              <span className={themeClasses.muted}>{stop.predictedTime}</span>
                            )}
                          </div>
                        </div>
                        {stop.delayMinutes !== undefined && stop.delayMinutes > 0 && (
                          <p className="text-xs text-amber-500 mt-1">
                            +{stop.delayMinutes} min delay
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Share CTA */}
            <div className={`mt-6 p-4 rounded-xl ${themeClasses.cardBg} text-center`}>
              <p className={`text-sm ${themeClasses.muted} mb-2`}>
                Share this train's live status with others
              </p>
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: themeClasses.accent }}
              >
                <Share2 className="w-4 h-4" />
                {copied ? "Link Copied!" : "Copy Share Link"}
              </button>
            </div>
          </>
        )}
      </div>
      
      <Footer />
    </div>
  );
}
