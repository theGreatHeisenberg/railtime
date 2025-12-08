"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { getTrainTypeStyle } from "@/lib/themes";
import { TrainDetailsResponse, TrainType } from "@/lib/types";
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
  const trainType = (trip?.trainType || "Local") as TrainType;
  const direction = trip?.direction || "SB";
  const trainStyle = getTrainTypeStyle(theme, trainType);
  
  // Find current/next stop
  const currentStop = trip?.stops?.find(s => s.status === "approaching");
  const nextStop = trip?.stops?.find(s => s.status === "scheduled");
  const passedStops = trip?.stops?.filter(s => s.status === "passed" || s.status === "departed") || [];
  const upcomingStops = trip?.stops?.filter(s => s.status === "scheduled" || s.status === "approaching") || [];

  return (
    <div className={`min-h-screen ${theme.classes.container} ${theme.classes.textPrimary} ${theme.typography.fontFamily}`}>
      <div className="max-w-2xl mx-auto p-4 lg:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            href="/"
            className={`flex items-center gap-2 px-3 py-2 transition-all ${theme.classes.card} ${theme.classes.cardHover}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <JourneyThemeSwitcher />
            <button
              onClick={handleShare}
              className={`flex items-center gap-2 px-3 py-2 transition-all ${theme.classes.card} ${theme.classes.cardHover}`}
            >
              {copied ? (
                <><Check className="w-4 h-4" style={{ color: theme.raw.accent.success }} /><span className="text-sm">Copied!</span></>
              ) : (
                <><Share2 className="w-4 h-4" /><span className="text-sm">Share</span></>
              )}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className={`text-center py-16 ${theme.classes.card}`}>
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: theme.raw.accent.primary }} />
            <p className={theme.classes.textMuted}>Loading train #{trainId}...</p>
          </div>
        )}
        
        {/* Error State */}
        {error && !loading && (
          <div className={`text-center py-16 ${theme.classes.card}`}>
            <Train className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium mb-2">{error}</p>
            <p className={`text-sm ${theme.classes.textMuted} mb-4`}>
              Train #{trainId} may have completed its journey or hasn't started yet.
            </p>
            <Link 
              href="/"
              className={`inline-flex items-center gap-2 px-4 py-2 text-white transition-all`}
              style={{ backgroundColor: theme.raw.accent.primary, borderRadius: theme.styles.borderRadius }}
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
            <div className={`${theme.classes.card} p-6 mb-4`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-16 flex items-center justify-center"
                    style={{ backgroundColor: trainStyle.bg, borderRadius: theme.styles.borderRadius }}
                  >
                    <Train className="w-8 h-8" style={{ color: trainStyle.text }} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-3xl font-bold">#{trip.trainNumber}</h1>
                      <span 
                        className="px-3 py-1 text-sm font-bold"
                        style={{ 
                          backgroundColor: trainStyle.bg, 
                          color: trainStyle.text,
                          borderRadius: theme.styles.borderRadius 
                        }}
                      >
                        {trainType}
                      </span>
                      <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium`} style={{ backgroundColor: theme.raw.bg.secondary, borderRadius: theme.styles.borderRadius }}>
                        {direction === "NB" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {direction === "NB" ? "Northbound" : "Southbound"}
                      </span>
                    </div>
                    <p className={theme.classes.textMuted}>
                      {trip.stops?.length || 0} stops total
                    </p>
                  </div>
                </div>
                
                {lastUpdated && (
                  <div className={`text-right text-xs ${theme.classes.textMuted}`}>
                    <RefreshCw className="w-3 h-3 inline-block mr-1" />
                    Updated {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
              </div>
              
              {/* Current Status */}
              {currentStop && (
                <div 
                  className="p-4 mb-4"
                  style={{ backgroundColor: `${theme.raw.accent.success}20`, borderRadius: theme.styles.borderRadius }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: theme.raw.accent.success }}>
                        Approaching
                      </p>
                      <p className="text-xl font-bold">{currentStop.stopName}</p>
                    </div>
                    {currentStop.etaMinutes !== null && currentStop.etaMinutes >= 0 && (
                      <div className="text-right">
                        <p className="text-3xl font-bold" style={{ color: theme.raw.accent.success }}>
                          {formatRelativeTime(currentStop.etaMinutes)}
                        </p>
                        <p className={`text-xs ${theme.classes.textMuted}`}>{currentStop.predictedTime}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Next Stop (if no current) */}
              {!currentStop && nextStop && (
                <div className="p-4" style={{ backgroundColor: theme.raw.bg.secondary, borderRadius: theme.styles.borderRadius }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${theme.classes.textMuted}`}>
                        Next Stop
                      </p>
                      <p className="text-xl font-bold">{nextStop.stopName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color: theme.raw.accent.primary }}>
                        {formatRelativeTime(nextStop.etaMinutes)}
                      </p>
                      <p className={`text-xs ${theme.classes.textMuted}`}>{nextStop.predictedTime}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Journey Progress */}
            <div className={`${theme.classes.card} p-6 mb-4`}>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" style={{ color: theme.raw.accent.primary }} />
                Journey Progress
              </h2>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <div className="h-2 overflow-hidden" style={{ backgroundColor: theme.raw.bg.secondary, borderRadius: theme.styles.borderRadius }}>
                    <div 
                      className="h-full transition-all duration-500"
                      style={{ 
                        width: `${trip.stops ? (passedStops.length / trip.stops.length) * 100 : 0}%`,
                        backgroundColor: theme.raw.accent.primary,
                        borderRadius: theme.styles.borderRadius
                      }}
                    />
                  </div>
                </div>
                <span className={`text-sm font-medium ${theme.classes.textMuted}`}>
                  {passedStops.length}/{trip.stops?.length || 0} stops
                </span>
              </div>
              
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 text-center" style={{ backgroundColor: theme.raw.bg.secondary, borderRadius: theme.styles.borderRadius }}>
                  <p className="text-2xl font-bold" style={{ color: theme.raw.accent.success }}>
                    {passedStops.length}
                  </p>
                  <p className={`text-xs ${theme.classes.textMuted}`}>Completed</p>
                </div>
                <div className="p-3 text-center" style={{ backgroundColor: theme.raw.bg.secondary, borderRadius: theme.styles.borderRadius }}>
                  <p className="text-2xl font-bold" style={{ color: theme.raw.accent.primary }}>
                    {currentStop ? 1 : 0}
                  </p>
                  <p className={`text-xs ${theme.classes.textMuted}`}>Current</p>
                </div>
                <div className="p-3 text-center" style={{ backgroundColor: theme.raw.bg.secondary, borderRadius: theme.styles.borderRadius }}>
                  <p className="text-2xl font-bold">
                    {upcomingStops.length}
                  </p>
                  <p className={`text-xs ${theme.classes.textMuted}`}>Remaining</p>
                </div>
              </div>
            </div>
            
            {/* All Stops Timeline */}
            <div className={`${theme.classes.card} p-6`}>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" style={{ color: theme.raw.accent.primary }} />
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
                          className={`w-4 h-4 border-2 ${isCurrent ? "animate-pulse" : ""}`}
                          style={{ 
                            backgroundColor: isPassed || isCurrent ? theme.raw.accent.primary : "transparent",
                            borderColor: theme.raw.accent.primary,
                            borderRadius: "50%"
                          }}
                        />
                        {!isLast && (
                          <div 
                            className="w-0.5 h-12"
                            style={{ backgroundColor: isPassed ? theme.raw.accent.primary : `${theme.raw.accent.primary}30` }}
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
                            <span 
                              className={`text-xs px-1.5 py-0.5 ${theme.classes.textMuted}`}
                              style={{ backgroundColor: theme.raw.bg.secondary, borderRadius: theme.styles.borderRadius }}
                            >
                              {getStationAbbr(stop.stopName)}
                            </span>
                            {isPassed && (
                              <Check className="w-4 h-4" style={{ color: theme.raw.accent.success }} />
                            )}
                            {isCurrent && (
                              <span 
                                className="text-xs px-2 py-0.5 text-white font-medium animate-pulse"
                                style={{ backgroundColor: theme.raw.accent.primary, borderRadius: theme.styles.borderRadius }}
                              >
                                Approaching
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            {!isPassed && stop.etaMinutes !== null && stop.etaMinutes >= 0 ? (
                              <div className="flex flex-col items-end">
                                <span className="font-medium" style={{ color: isCurrent ? theme.raw.accent.success : undefined }}>
                                  {formatRelativeTime(stop.etaMinutes)}
                                </span>
                                <span className={`text-xs ${theme.classes.textMuted}`}>{stop.predictedTime}</span>
                              </div>
                            ) : (
                              <span className={theme.classes.textMuted}>{stop.predictedTime}</span>
                            )}
                          </div>
                        </div>
                        {stop.delayMinutes !== undefined && stop.delayMinutes > 0 && (
                          <p className="text-xs mt-1" style={{ color: theme.raw.accent.warning }}>
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
            <div 
              className="mt-6 p-4 text-center"
              style={{ backgroundColor: theme.raw.bg.secondary, borderRadius: theme.styles.borderRadius }}
            >
              <p className={`text-sm ${theme.classes.textMuted} mb-2`}>
                Share this train's live status with others
              </p>
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-4 py-2 text-white font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: theme.raw.accent.primary, borderRadius: theme.styles.borderRadius }}
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
