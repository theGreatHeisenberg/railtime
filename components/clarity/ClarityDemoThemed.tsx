"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Train, MapPin, Clock, ArrowRight, Check, RotateCcw, ChevronDown, ChevronUp, Info, Palette, X } from "lucide-react";
import { ThemeName, themes } from "@/lib/themes";

// Extended mock journey data for pagination demo
const allMockJourneys = [
  {
    id: "501",
    trainNumber: "501",
    trainType: "Bullet" as const,
    origin: "San Francisco",
    destination: "San Jose Diridon",
    departureTime: "8:15 AM",
    arrivalTime: "9:02 AM",
    duration: 47,
    stops: 3,
    status: "live" as const,
    etaMinutes: 12,
    progress: 0.65,
    currentSegment: { from: "Millbrae", to: "Palo Alto", segmentProgress: 0.4 },
  },
  {
    id: "103",
    trainNumber: "103",
    trainType: "Local" as const,
    origin: "San Francisco",
    destination: "San Jose Diridon",
    departureTime: "8:22 AM",
    arrivalTime: "9:45 AM",
    duration: 83,
    stops: 12,
    status: "live" as const,
    etaMinutes: 19,
    progress: 0.25,
    currentSegment: { from: "San Francisco", to: "22nd Street", segmentProgress: 0.8 },
  },
  {
    id: "505",
    trainNumber: "505",
    trainType: "Bullet" as const,
    origin: "San Francisco",
    destination: "San Jose Diridon",
    departureTime: "8:45 AM",
    arrivalTime: "9:32 AM",
    duration: 47,
    stops: 3,
    status: "scheduled" as const,
    etaMinutes: 42,
    progress: 0,
    currentSegment: null,
  },
  {
    id: "421",
    trainNumber: "421",
    trainType: "Limited" as const,
    origin: "San Francisco",
    destination: "San Jose Diridon",
    departureTime: "9:00 AM",
    arrivalTime: "9:55 AM",
    duration: 55,
    stops: 6,
    status: "scheduled" as const,
    etaMinutes: 57,
    progress: 0,
    currentSegment: null,
  },
  {
    id: "507",
    trainNumber: "507",
    trainType: "Bullet" as const,
    origin: "San Francisco",
    destination: "San Jose Diridon",
    departureTime: "9:15 AM",
    arrivalTime: "10:02 AM",
    duration: 47,
    stops: 3,
    status: "scheduled" as const,
    etaMinutes: 72,
    progress: 0,
    currentSegment: null,
  },
  {
    id: "105",
    trainNumber: "105",
    trainType: "Local" as const,
    origin: "San Francisco",
    destination: "San Jose Diridon",
    departureTime: "9:22 AM",
    arrivalTime: "10:45 AM",
    duration: 83,
    stops: 12,
    status: "scheduled" as const,
    etaMinutes: 79,
    progress: 0,
    currentSegment: null,
  },
  {
    id: "509",
    trainNumber: "509",
    trainType: "Bullet" as const,
    origin: "San Francisco",
    destination: "San Jose Diridon",
    departureTime: "9:45 AM",
    arrivalTime: "10:32 AM",
    duration: 47,
    stops: 3,
    status: "scheduled" as const,
    etaMinutes: 102,
    progress: 0,
    currentSegment: null,
  },
  {
    id: "423",
    trainNumber: "423",
    trainType: "Limited" as const,
    origin: "San Francisco",
    destination: "San Jose Diridon",
    departureTime: "10:00 AM",
    arrivalTime: "10:55 AM",
    duration: 55,
    stops: 6,
    status: "scheduled" as const,
    etaMinutes: 117,
    progress: 0,
    currentSegment: null,
  },
  {
    id: "511",
    trainNumber: "511",
    trainType: "Bullet" as const,
    origin: "San Francisco",
    destination: "San Jose Diridon",
    departureTime: "10:15 AM",
    arrivalTime: "11:02 AM",
    duration: 47,
    stops: 3,
    status: "scheduled" as const,
    etaMinutes: 132,
    progress: 0,
    currentSegment: null,
  },
  {
    id: "107",
    trainNumber: "107",
    trainType: "Local" as const,
    origin: "San Francisco",
    destination: "San Jose Diridon",
    departureTime: "10:22 AM",
    arrivalTime: "11:45 AM",
    duration: 83,
    stops: 12,
    status: "scheduled" as const,
    etaMinutes: 139,
    progress: 0,
    currentSegment: null,
  },
];

const INITIAL_TRAINS_COUNT = 4;
const LOAD_MORE_COUNT = 3;

type Journey = typeof allMockJourneys[0];

// Theme-specific color configurations
const themeColors: Record<ThemeName, {
  bg: { primary: string; elevated: string; secondary: string };
  text: { primary: string; secondary: string; muted: string; inverse: string };
  accent: { selection: string; success: string; warning: string };
  trainType: { bullet: string; limited: string; local: string };
  connector: string;
  highlight: string;
  border: string;
  shadow: string;
  shadowSelection: string;
}> = {
  swiss: {
    bg: { primary: '#FFFFFF', elevated: '#FFFFFF', secondary: '#F3F4F6' },
    text: { primary: '#111827', secondary: '#374151', muted: '#6B7280', inverse: '#FFFFFF' },
    accent: { selection: '#E31837', success: '#22C55E', warning: '#F59E0B' },
    trainType: { bullet: '#EF4444', limited: '#F59E0B', local: '#3B82F6' },
    connector: 'rgba(227, 24, 55, 0.3)',
    highlight: 'rgba(227, 24, 55, 0.08)',
    border: '#E5E7EB',
    shadow: 'none',
    shadowSelection: '0 0 0 2px rgba(227, 24, 55, 0.3)',
  },
  'swiss-dark': {
    bg: { primary: '#111827', elevated: '#1F2937', secondary: '#374151' },
    text: { primary: '#F9FAFB', secondary: '#E5E7EB', muted: '#9CA3AF', inverse: '#111827' },
    accent: { selection: '#F87171', success: '#34D399', warning: '#FBBF24' },
    trainType: { bullet: '#F87171', limited: '#FBBF24', local: '#60A5FA' },
    connector: 'rgba(248, 113, 113, 0.3)',
    highlight: 'rgba(248, 113, 113, 0.08)',
    border: '#374151',
    shadow: 'none',
    shadowSelection: '0 0 0 2px rgba(248, 113, 113, 0.3)',
  },
  obsidian: {
    bg: { primary: '#050506', elevated: '#0a0a0c', secondary: '#0f0f12' },
    text: { primary: '#EDEDEF', secondary: '#EDEDEF', muted: '#8A8F98', inverse: '#050506' },
    accent: { selection: '#5E6AD2', success: '#34D399', warning: '#FBBF24' },
    trainType: { bullet: '#F472B6', limited: '#FBBF24', local: '#5E6AD2' },
    connector: 'rgba(94, 106, 210, 0.4)',
    highlight: 'rgba(94, 106, 210, 0.1)',
    border: 'rgba(255,255,255,0.06)',
    shadow: '0 0 0 1px rgba(255,255,255,0.06)',
    shadowSelection: '0 0 30px rgba(94, 106, 210, 0.2)',
  },
  napkin: {
    bg: { primary: '#fdfbf7', elevated: '#FFFFFF', secondary: '#e5e0d8' },
    text: { primary: '#2d2d2d', secondary: '#2d2d2d', muted: 'rgba(45,45,45,0.5)', inverse: '#FFFFFF' },
    accent: { selection: '#ff4d4d', success: '#2d5da1', warning: '#ff4d4d' },
    trainType: { bullet: '#ff4d4d', limited: '#fff9c4', local: '#2d5da1' },
    connector: 'rgba(45, 45, 45, 0.4)',
    highlight: 'rgba(45, 45, 45, 0.1)',
    border: '#2d2d2d',
    shadow: '4px 4px 0px 0px #2d2d2d',
    shadowSelection: '6px 6px 0px 0px #2d2d2d',
  },
  confetti: {
    bg: { primary: '#FFFDF5', elevated: '#FFFFFF', secondary: '#FEF3C7' },
    text: { primary: '#1E293B', secondary: '#334155', muted: '#64748B', inverse: '#FFFFFF' },
    accent: { selection: '#8B5CF6', success: '#34D399', warning: '#FBBF24' },
    trainType: { bullet: '#F472B6', limited: '#FBBF24', local: '#8B5CF6' },
    connector: 'rgba(139, 92, 246, 0.4)',
    highlight: 'rgba(139, 92, 246, 0.1)',
    border: '#1E293B',
    shadow: '4px 4px 0px 0px #1E293B',
    shadowSelection: '6px 6px 0px 0px #1E293B',
  },
  minimalist: {
    bg: { primary: '#FFFFFF', elevated: '#FFFFFF', secondary: '#F2F2F2' },
    text: { primary: '#000000', secondary: '#000000', muted: '#666666', inverse: '#FFFFFF' },
    accent: { selection: '#FF3000', success: '#000000', warning: '#FF3000' },
    trainType: { bullet: '#FF3000', limited: '#000000', local: '#F2F2F2' },
    connector: 'rgba(0, 0, 0, 0.4)',
    highlight: 'rgba(255, 48, 0, 0.1)',
    border: '#000000',
    shadow: 'none',
    shadowSelection: 'none',
  },
};

function getTrainTypeColor(type: Journey["trainType"], themeName: ThemeName) {
  const colors = themeColors[themeName];
  switch (type) {
    case "Bullet": return colors.trainType.bullet;
    case "Limited": return colors.trainType.limited;
    default: return colors.trainType.local;
  }
}

function formatEta(minutes: number): string {
  if (minutes <= 1) return "Arriving now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
}

export default function ClarityDemoThemed() {
  const [themeName, setThemeName] = useState<ThemeName>('swiss');
  const [expandedJourney, setExpandedJourney] = useState<string | null>(null);
  const [expandedStops, setExpandedStops] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_TRAINS_COUNT);
  
  const visibleJourneys = allMockJourneys.slice(0, visibleCount);
  const hasMoreTrains = visibleCount < allMockJourneys.length;
  const expandedCardRef = useRef<HTMLDivElement>(null);

  const colors = themeColors[themeName];
  const theme = themes[themeName];
  const isPlayful = themeName === 'confetti';
  const isDark = themeName === 'obsidian' || themeName === 'swiss-dark';

  const handleToggleExpand = useCallback((journeyId: string) => {
    if (expandedJourney === journeyId) {
      // Collapse
      setExpandedJourney(null);
      setExpandedStops(false);
      setLastAction("Collapsed train details");
    } else {
      // Expand new one (auto-collapses previous)
      setExpandedJourney(journeyId);
      setExpandedStops(false);
      setLastAction(`Viewing Train #${journeyId}`);
      // Scroll to expanded card after a short delay
      setTimeout(() => {
        expandedCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
    setFeedbackVisible(true);
    setTimeout(() => setFeedbackVisible(false), 2000);
  }, [expandedJourney]);

  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + LOAD_MORE_COUNT, allMockJourneys.length));
    setLastAction(`Loaded ${LOAD_MORE_COUNT} more trains`);
    setFeedbackVisible(true);
    setTimeout(() => setFeedbackVisible(false), 2000);
  }, []);

  return (
    <div 
      className={`min-h-screen transition-colors duration-500 ${isPlayful ? 'playful-dots' : ''}`}
      style={{ backgroundColor: colors.bg.primary }}
    >
      {/* Header */}
      <header 
        className={`sticky top-0 z-20 border-b transition-all duration-300 ${isPlayful ? 'border-2' : ''}`}
        style={{ 
          backgroundColor: colors.bg.elevated,
          borderColor: colors.border,
          boxShadow: colors.shadow,
        }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div 
                className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center transition-all duration-300 ${isPlayful ? 'rounded-xl border-2 shadow-[3px_3px_0px_0px_#1E293B]' : 'rounded-lg'}`}
                style={{ 
                  backgroundColor: colors.accent.selection,
                  borderColor: isPlayful ? '#1E293B' : 'transparent',
                }}
              >
                <Train className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: colors.text.inverse }} />
              </div>
              <div>
                <h1 
                  className={`text-lg sm:text-xl ${themeName === 'napkin' ? 'font-[var(--font-kalam)]' : ''}`}
                  style={{ color: colors.text.primary, fontWeight: 600 }}
                >
                  {theme.typography.logoText}
                </h1>
                <p className="text-xs sm:text-sm hidden sm:block" style={{ color: colors.text.muted }}>
                  Clarity-First UX • {theme.label}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Live indicator */}
              <div 
                className={`hidden sm:flex items-center gap-2 px-3 py-1.5 ${isPlayful ? 'rounded-full border-2' : 'rounded-full'}`}
                style={{ 
                  backgroundColor: colors.highlight,
                  borderColor: isPlayful ? '#1E293B' : 'transparent',
                }}
              >
                <div 
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: colors.accent.success }}
                />
                <span className="text-sm font-medium" style={{ color: colors.text.secondary }}>
                  Live Data
                </span>
              </div>
              
              <div 
                className="sm:hidden w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: colors.accent.success }}
                title="Live Data"
              />
              
              {/* Theme Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowThemePicker(!showThemePicker)}
                  className={`p-1.5 sm:p-2 transition-all duration-200 ${isPlayful ? 'rounded-xl border-2 shadow-[3px_3px_0px_0px_#1E293B] hover:shadow-[4px_4px_0px_0px_#1E293B] hover:-translate-y-0.5' : 'rounded-lg hover:scale-105'}`}
                  style={{ 
                    backgroundColor: colors.bg.secondary,
                    borderColor: isPlayful ? '#1E293B' : colors.border,
                  }}
                >
                  <Palette className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: colors.accent.selection }} />
                </button>
                
                {showThemePicker && (
                  <div 
                    className={`absolute right-0 top-10 sm:top-12 p-2 z-50 min-w-[160px] sm:min-w-[180px] ${isPlayful ? 'rounded-xl border-2 shadow-[4px_4px_0px_0px_#1E293B]' : 'rounded-lg shadow-lg'}`}
                    style={{ 
                      backgroundColor: colors.bg.elevated,
                      borderColor: isPlayful ? '#1E293B' : colors.border,
                    }}
                  >
                    {(Object.keys(themes) as ThemeName[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => { setThemeName(t); setShowThemePicker(false); }}
                        className={`w-full text-left px-3 py-2 text-sm transition-all duration-150 ${isPlayful ? 'rounded-lg' : 'rounded-md'} ${themeName === t ? 'font-semibold' : ''}`}
                        style={{ 
                          backgroundColor: themeName === t ? colors.highlight : 'transparent',
                          color: themeName === t ? colors.accent.selection : colors.text.primary,
                        }}
                      >
                        {themes[t].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Action Feedback Toast */}
      <div 
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300"
        style={{
          opacity: feedbackVisible ? 1 : 0,
          transform: `translateX(-50%) translateY(${feedbackVisible ? '0' : '-10px'})`,
          pointerEvents: feedbackVisible ? 'auto' : 'none',
        }}
      >
        <div 
          className={`flex items-center gap-2 px-4 py-2 ${isPlayful ? 'rounded-xl border-2 shadow-[3px_3px_0px_0px_#1E293B]' : 'rounded-lg'}`}
          style={{
            backgroundColor: colors.bg.elevated,
            boxShadow: isPlayful ? undefined : colors.shadowSelection,
            border: `1px solid ${colors.connector}`,
            borderWidth: isPlayful ? 2 : 1,
            borderColor: isPlayful ? '#1E293B' : colors.connector,
          }}
        >
          <Check className="w-4 h-4" style={{ color: colors.accent.success }} />
          <span className="text-sm font-medium" style={{ color: colors.text.primary }}>
            {lastAction}
          </span>
        </div>
      </div>

      {/* Main Content - Single Column Full Width */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Route Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-2" style={{ color: colors.text.primary }}>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: colors.accent.selection }} />
              <span className={`text-base sm:text-lg font-semibold ${themeName === 'napkin' ? 'font-[var(--font-patrick-hand)]' : ''}`}>
                San Francisco
              </span>
            </div>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: colors.text.muted }} />
            <div className="flex items-center gap-1.5 sm:gap-2">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: colors.accent.success }} />
              <span className={`text-base sm:text-lg font-semibold ${themeName === 'napkin' ? 'font-[var(--font-patrick-hand)]' : ''}`}>
                San Jose Diridon
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm" style={{ color: colors.text.muted }}>
            {allMockJourneys.length} trains available • Next departure in {allMockJourneys[0].etaMinutes} min
          </p>
        </div>

        {/* Journey List - Full Width Expandable Cards */}
        <div className="space-y-3">
          {visibleJourneys.map((journey, index) => (
            <ExpandableJourneyCard
              key={journey.id}
              journey={journey}
              isExpanded={expandedJourney === journey.id}
              onToggle={() => handleToggleExpand(journey.id)}
              expandedStops={expandedStops}
              onToggleStops={() => setExpandedStops(!expandedStops)}
              themeName={themeName}
              colors={colors}
              delay={index * 50}
              ref={expandedJourney === journey.id ? expandedCardRef : null}
            />
          ))}
          
          {/* Show More Button */}
          {hasMoreTrains && (
            <button
              onClick={handleLoadMore}
              className={`w-full py-3 px-4 flex items-center justify-center gap-2 transition-all duration-200 ${isPlayful ? 'rounded-xl border-2 shadow-[3px_3px_0px_0px_#1E293B] hover:shadow-[4px_4px_0px_0px_#1E293B] hover:-translate-y-0.5' : 'rounded-xl border hover:scale-[1.01]'}`}
              style={{
                backgroundColor: colors.bg.elevated,
                borderColor: isPlayful ? colors.text.primary : colors.border,
                color: colors.text.primary,
              }}
            >
              <ChevronDown className="w-4 h-4" style={{ color: colors.accent.selection }} />
              <span className="font-medium">
                Show {Math.min(LOAD_MORE_COUNT, allMockJourneys.length - visibleCount)} more trains
              </span>
              <span className="text-sm" style={{ color: colors.text.muted }}>
                ({allMockJourneys.length - visibleCount} remaining)
              </span>
            </button>
          )}
          
          {!hasMoreTrains && visibleCount > INITIAL_TRAINS_COUNT && (
            <div 
              className="text-center py-3 text-sm"
              style={{ color: colors.text.muted }}
            >
              All {allMockJourneys.length} trains loaded
            </div>
          )}
        </div>
      </main>

      {/* Philosophy Footer */}
      <footer 
        className={`border-t mt-16 py-8 ${isPlayful ? 'border-t-2' : ''}`}
        style={{ backgroundColor: colors.bg.secondary, borderColor: colors.border }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h3 
            className={`mb-4 text-lg font-semibold ${themeName === 'napkin' ? 'font-[var(--font-kalam)]' : ''}`}
            style={{ color: colors.text.primary }}
          >
            Clarity-First UX Principles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PrincipleCard 
              title="Expandable Cards"
              description="Click any train to expand and see details inline. One card at a time keeps focus clear."
              themeName={themeName}
              colors={colors}
            />
            <PrincipleCard 
              title="Responsible Feedback"
              description="Calm confirmations and smooth animations. No fake urgency or anxiety-inducing alerts."
              themeName={themeName}
              colors={colors}
            />
            <PrincipleCard 
              title="Progressive Disclosure"
              description="Essential info shown first. Stop details expand on demand. Complexity deferred until needed."
              themeName={themeName}
              colors={colors}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}


// Expandable Journey Card Component - Accordion style
interface ExpandableJourneyCardProps {
  journey: Journey;
  isExpanded: boolean;
  onToggle: () => void;
  expandedStops: boolean;
  onToggleStops: () => void;
  themeName: ThemeName;
  colors: typeof themeColors[ThemeName];
  delay: number;
}

const ExpandableJourneyCard = React.forwardRef<HTMLDivElement, ExpandableJourneyCardProps>(
  ({ journey, isExpanded, onToggle, expandedStops, onToggleStops, themeName, colors, delay }, ref) => {
    const trainColor = getTrainTypeColor(journey.trainType, themeName);
    const isPlayful = themeName === 'confetti';
    const isDark = themeName === 'obsidian' || themeName === 'swiss-dark';
    
    const stops = [
      { name: "San Francisco", time: journey.departureTime, status: "origin" },
      { name: "Millbrae", time: "8:28 AM", status: "stop" },
      { name: "Palo Alto", time: "8:45 AM", status: "stop" },
      { name: "San Jose Diridon", time: journey.arrivalTime, status: "destination" },
    ];
    
    return (
      <div
        ref={ref}
        className={`transition-all duration-300 overflow-hidden ${isPlayful ? 'rounded-2xl border-2' : 'rounded-xl border'}`}
        style={{
          backgroundColor: colors.bg.elevated,
          borderColor: isExpanded ? colors.accent.selection : colors.border,
          borderWidth: isPlayful ? 2 : isExpanded ? 2 : 1,
          boxShadow: isExpanded ? colors.shadowSelection : 'none',
          animationDelay: `${delay}ms`,
        }}
      >
        {/* Card Header - Always visible, clickable */}
        <button
          onClick={onToggle}
          className="w-full text-left transition-all duration-200 group"
          style={{ backgroundColor: 'transparent' }}
        >
          {/* Selection indicator bar */}
          {!isPlayful && (
            <div 
              className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 rounded-l-xl"
              style={{
                backgroundColor: isExpanded ? colors.accent.selection : 'transparent',
              }}
            />
          )}
          
          <div className="p-4 relative">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Train icon */}
                <div 
                  className={`w-12 h-12 flex items-center justify-center transition-all duration-300 flex-shrink-0 ${isPlayful ? 'rounded-xl border-2 shadow-[2px_2px_0px_0px_#1E293B]' : 'rounded-lg'}`}
                  style={{ 
                    backgroundColor: `${trainColor}20`,
                    borderColor: isPlayful ? colors.text.primary : 'transparent',
                    transform: isExpanded ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  <Train 
                    className="w-6 h-6 transition-all duration-300" 
                    style={{ color: trainColor, transform: isExpanded ? 'rotate(-5deg)' : 'rotate(0)' }} 
                  />
                </div>
                
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                      #{journey.trainNumber}
                    </span>
                    <span 
                      className={`px-2 py-0.5 text-xs font-medium ${isPlayful ? 'rounded-full border-2' : 'rounded'}`}
                      style={{ 
                        backgroundColor: `${trainColor}20`,
                        color: trainColor,
                        borderColor: isPlayful ? colors.text.primary : 'transparent',
                      }}
                    >
                      {journey.trainType}
                    </span>
                    <span 
                      className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${isPlayful ? 'rounded-full border-2' : 'rounded'}`}
                      style={{ 
                        backgroundColor: journey.status === 'live' ? `${colors.accent.success}20` : colors.bg.secondary,
                        color: journey.status === 'live' ? colors.accent.success : colors.text.muted,
                        borderColor: isPlayful ? colors.text.primary : 'transparent',
                      }}
                    >
                      <div 
                        className={`w-1.5 h-1.5 rounded-full ${journey.status === 'live' ? 'animate-pulse' : ''}`}
                        style={{ backgroundColor: journey.status === 'live' ? colors.accent.success : colors.text.muted }}
                      />
                      {journey.status === 'live' ? 'Live' : 'Scheduled'}
                    </span>
                  </div>
                  <span className="text-sm" style={{ color: colors.text.muted }}>
                    {journey.stops} stops • {journey.duration} min
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div 
                    className="text-2xl font-semibold transition-all duration-300"
                    style={{ 
                      color: journey.etaMinutes <= 5 ? colors.accent.success : colors.text.primary,
                    }}
                  >
                    {formatEta(journey.etaMinutes)}
                  </div>
                  <span className="text-sm" style={{ color: colors.text.muted }}>
                    {journey.departureTime}
                  </span>
                </div>
                
                {/* Expand/Collapse indicator */}
                <div 
                  className={`w-8 h-8 flex items-center justify-center transition-all duration-300 ${isPlayful ? 'rounded-lg border-2' : 'rounded-full'}`}
                  style={{ 
                    backgroundColor: isExpanded ? colors.highlight : 'transparent',
                    borderColor: isPlayful ? colors.text.primary : 'transparent',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  <ChevronDown className="w-5 h-5" style={{ color: colors.accent.selection }} />
                </div>
              </div>
            </div>
          </div>
        </button>
        
        {/* Expandable Details Section */}
        <div 
          className="overflow-hidden transition-all duration-500 ease-in-out"
          style={{ 
            maxHeight: isExpanded ? '800px' : '0',
            opacity: isExpanded ? 1 : 0,
          }}
        >
          {/* Divider */}
          <div 
            className={`mx-4 ${isPlayful ? 'border-t-2 border-dashed' : 'border-t'}`}
            style={{ borderColor: colors.border }}
          />
          
          {/* Journey Summary */}
          <div className="p-4">
            <div 
              className={`flex items-center gap-4 p-4 ${isPlayful ? 'rounded-xl border-2' : 'rounded-lg'}`}
              style={{ 
                backgroundColor: colors.bg.secondary,
                borderColor: isPlayful ? colors.text.primary : 'transparent',
              }}
            >
              <div className="flex-1">
                <div className="text-sm mb-1" style={{ color: colors.text.muted }}>Departs</div>
                <div className="text-lg font-semibold" style={{ color: colors.text.primary }}>{journey.departureTime}</div>
                <div className="text-sm" style={{ color: colors.text.secondary }}>{journey.origin}</div>
              </div>
              
              <div className="flex flex-col items-center gap-1">
                <ArrowRight className="w-5 h-5" style={{ color: colors.text.muted }} />
                <span 
                  className={`text-xs px-2 py-0.5 ${isPlayful ? 'rounded-full border-2' : 'rounded-full'}`}
                  style={{ 
                    backgroundColor: colors.highlight,
                    color: colors.text.secondary,
                    borderColor: isPlayful ? colors.text.primary : 'transparent',
                  }}
                >
                  {journey.duration} min
                </span>
              </div>
              
              <div className="flex-1 text-right">
                <div className="text-sm mb-1" style={{ color: colors.text.muted }}>Arrives</div>
                <div className="text-lg font-semibold" style={{ color: colors.accent.success }}>{journey.arrivalTime}</div>
                <div className="text-sm" style={{ color: colors.text.secondary }}>{journey.destination}</div>
              </div>
            </div>
          </div>
          
          {/* Train Progress Track */}
          <TrainProgressTrack 
            journey={journey}
            themeName={themeName}
            colors={colors}
            stops={stops}
          />
          
          {/* Stops - Progressive Disclosure */}
          <div className="p-4">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleStops(); }}
              className={`w-full flex items-center justify-between p-3 transition-all duration-200 ${isPlayful ? 'rounded-xl border-2 hover:shadow-[2px_2px_0px_0px_#1E293B]' : 'rounded-lg hover:bg-opacity-50'}`}
              style={{ 
                backgroundColor: expandedStops ? colors.bg.secondary : 'transparent',
                borderColor: isPlayful ? colors.text.primary : 'transparent',
              }}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: colors.text.muted }} />
                <span className="font-medium" style={{ color: colors.text.primary }}>
                  {journey.stops} stops on this route
                </span>
              </div>
              {expandedStops ? (
                <ChevronUp className="w-5 h-5" style={{ color: colors.text.muted }} />
              ) : (
                <ChevronDown className="w-5 h-5" style={{ color: colors.text.muted }} />
              )}
            </button>
            
            <div 
              className="overflow-hidden transition-all duration-500"
              style={{ maxHeight: expandedStops ? '400px' : '0', opacity: expandedStops ? 1 : 0 }}
            >
              <div className="pt-4 pl-4 space-y-0">
                {stops.map((stop, index) => (
                  <div 
                    key={stop.name}
                    className="flex items-start gap-4 transition-all duration-300"
                    style={{
                      opacity: expandedStops ? 1 : 0,
                      transform: expandedStops ? 'translateX(0)' : 'translateX(-10px)',
                      transitionDelay: `${index * 80}ms`,
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <div 
                        className="w-3 h-3 rounded-full border-2"
                        style={{
                          borderColor: stop.status === 'origin' ? colors.accent.selection : stop.status === 'destination' ? colors.accent.success : colors.text.muted,
                          backgroundColor: stop.status !== 'stop' ? (stop.status === 'origin' ? colors.accent.selection : colors.accent.success) : 'transparent',
                        }}
                      />
                      {index < stops.length - 1 && (
                        <div className="w-0.5 h-10" style={{ backgroundColor: colors.connector }} />
                      )}
                    </div>
                    <div className="pb-4">
                      <div style={{ color: colors.text.primary, fontWeight: stop.status !== 'stop' ? 600 : 400 }}>
                        {stop.name}
                      </div>
                      <div className="text-sm" style={{ color: colors.text.muted }}>{stop.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Info footer */}
          <div 
            className={`px-4 py-3 flex items-center gap-2 ${isPlayful ? 'border-t-2' : 'border-t'}`}
            style={{ borderColor: colors.border, backgroundColor: colors.bg.secondary }}
          >
            <Info className="w-4 h-4" style={{ color: colors.text.muted }} />
            <span className="text-sm" style={{ color: colors.text.muted }}>
              Times shown are predictions based on live tracking data
            </span>
          </div>
        </div>
      </div>
    );
  }
);

ExpandableJourneyCard.displayName = 'ExpandableJourneyCard';


// Train Progress Track Component - Shows live train position along the route
interface TrainProgressTrackProps {
  journey: Journey;
  themeName: ThemeName;
  colors: typeof themeColors[ThemeName];
  stops: Array<{ name: string; time: string; status: string }>;
}

function TrainProgressTrack({ journey, themeName, colors, stops }: TrainProgressTrackProps) {
  const isPlayful = themeName === 'confetti';
  const isDark = themeName === 'obsidian' || themeName === 'swiss-dark';
  const trainColor = getTrainTypeColor(journey.trainType, themeName);
  
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      setAnimatedProgress(journey.progress);
    }, 300);
    
    const moveInterval = setInterval(() => {
      setAnimatedProgress(prev => {
        if (journey.status === 'live' && prev < 0.95) {
          return Math.min(prev + 0.005, 0.95);
        }
        return prev;
      });
    }, 3000);
    
    return () => {
      clearTimeout(initialTimer);
      clearInterval(moveInterval);
    };
  }, [journey.progress, journey.id, journey.status]);
  
  const TRACK_START = 8;
  const TRACK_END = 92;
  const trainPosition = TRACK_START + (animatedProgress * (TRACK_END - TRACK_START));
  
  const getStationPosition = (index: number, total: number) => {
    return TRACK_START + (index / (total - 1)) * (TRACK_END - TRACK_START);
  };
  
  const getTrackBg = () => {
    if (themeName === 'swiss') return { backgroundColor: '#F3F4F6' };
    if (isPlayful) return { backgroundColor: '#E2E8F0', border: '2px solid #1E293B' };
    if (themeName === 'napkin') return { backgroundColor: '#e5e0d8', border: '3px solid #2d2d2d' };
    if (themeName === 'obsidian') return { backgroundColor: 'rgba(255,255,255,0.06)' };
    return { backgroundColor: colors.bg.secondary };
  };
  
  const getProgressBg = () => {
    if (themeName === 'swiss') return { backgroundColor: '#E31837' };
    if (isPlayful) return { background: 'linear-gradient(90deg, #8B5CF6, #F472B6, #FBBF24)' };
    if (themeName === 'napkin') return { backgroundColor: '#2d2d2d' };
    if (themeName === 'obsidian') return { background: 'linear-gradient(90deg, #5E6AD2, #6872D9)' };
    return { backgroundColor: colors.accent.selection };
  };
  
  const getTrainIconStyle = () => {
    if (themeName === 'swiss') return { backgroundColor: '#E31837' };
    if (isPlayful) return { backgroundColor: '#8B5CF6', border: '2px solid #1E293B', boxShadow: '3px 3px 0px 0px #1E293B' };
    if (themeName === 'napkin') return { backgroundColor: '#ff4d4d', border: '3px solid #2d2d2d', boxShadow: '3px 3px 0px 0px #2d2d2d' };
    if (themeName === 'obsidian') return { background: 'linear-gradient(135deg, #5E6AD2, #6872D9)', boxShadow: '0 0 20px rgba(94,106,210,0.3)' };
    return { backgroundColor: colors.accent.selection };
  };
  
  if (journey.status !== 'live') {
    return (
      <div 
        className={`px-4 py-4 ${isPlayful ? 'border-y-2' : 'border-y'}`}
        style={{ borderColor: colors.border, backgroundColor: colors.bg.secondary }}
      >
        <div className="flex items-center justify-center gap-2">
          <Clock className="w-4 h-4" style={{ color: colors.text.muted }} />
          <span className="text-sm" style={{ color: colors.text.muted }}>
            Train position will be shown when service begins
          </span>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={`px-4 py-4 ${isPlayful ? 'border-y-2' : 'border-y'}`}
      style={{ borderColor: colors.border }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: colors.accent.success }}
          />
          <span className="text-sm font-medium" style={{ color: colors.text.primary }}>
            Live Position
          </span>
        </div>
        {journey.currentSegment && (
          <span className="text-xs" style={{ color: colors.text.muted }}>
            Between {journey.currentSegment.from} → {journey.currentSegment.to}
          </span>
        )}
      </div>
      
      <div className="relative h-20">
        {Array.from({ length: 10 }, (_, i) => (i + 1) * 9).map((pos) => (
          <div 
            key={pos}
            className="absolute top-4 w-1 h-2 rounded-sm"
            style={{ 
              left: `${pos}%`, 
              transform: 'translateX(-50%)',
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            }}
          />
        ))}
        
        <div 
          className="absolute top-4 left-[8%] right-[8%] h-2 rounded-full"
          style={getTrackBg()}
        />
        
        <div 
          className="absolute top-4 left-[8%] h-2 rounded-full transition-all duration-1000 ease-out"
          style={{ 
            ...getProgressBg(),
            width: `${animatedProgress * 84}%`,
          }}
        />
        
        {stops.map((stop, index) => {
          const position = getStationPosition(index, stops.length);
          const isPassed = position <= trainPosition;
          const isOrigin = stop.status === 'origin';
          const isDestination = stop.status === 'destination';
          
          return (
            <div 
              key={stop.name}
              className="absolute flex flex-col items-center transition-all duration-500"
              style={{ 
                left: `${position}%`, 
                transform: 'translateX(-50%)',
                top: '0',
              }}
            >
              <div 
                className={`w-4 h-4 rounded-full border-2 transition-all duration-500 ${isPlayful ? 'shadow-[2px_2px_0px_0px_#1E293B]' : ''}`}
                style={{ 
                  backgroundColor: isPassed 
                    ? (isOrigin ? colors.accent.selection : isDestination ? colors.accent.success : colors.accent.selection)
                    : colors.bg.elevated,
                  borderColor: isOrigin ? colors.accent.selection : isDestination ? colors.accent.success : colors.text.muted,
                  transform: isPassed ? 'scale(1.1)' : 'scale(1)',
                }}
              />
              
              <div className="mt-3 text-center">
                <div 
                  className="text-[10px] font-medium uppercase tracking-wide"
                  style={{ color: colors.text.muted }}
                >
                  {isOrigin ? 'Board' : isDestination ? 'Exit' : ''}
                </div>
                <div 
                  className="text-xs font-semibold truncate max-w-[60px]"
                  style={{ color: isPassed ? colors.text.primary : colors.text.muted }}
                >
                  {stop.name.split(' ')[0]}
                </div>
              </div>
            </div>
          );
        })}
        
        <div 
          className="absolute top-4 z-10 transition-all duration-1000 ease-out"
          style={{ 
            left: `${trainPosition}%`, 
            transform: 'translateX(-50%) translateY(-50%)',
          }}
        >
          <div 
            className={`w-10 h-10 rounded-full flex items-center justify-center ${isPlayful ? 'animate-bounce' : ''}`}
            style={getTrainIconStyle()}
          >
            <Train 
              className="w-5 h-5 transition-transform duration-300" 
              style={{ 
                color: isDark || isPlayful ? '#FFFFFF' : colors.text.inverse,
                transform: 'rotate(-5deg)',
              }} 
            />
          </div>
          
          <div 
            className="absolute inset-0 rounded-full animate-ping"
            style={{ 
              backgroundColor: trainColor,
              opacity: 0.3,
            }}
          />
        </div>
      </div>
      
      <div className="mt-2 text-center">
        <span className="text-sm" style={{ color: colors.text.muted }}>
          {Math.round(animatedProgress * 100)}% of journey complete
        </span>
      </div>
    </div>
  );
}

// Principle Card Component
function PrincipleCard({ title, description, themeName, colors }: { 
  title: string; 
  description: string; 
  themeName: ThemeName;
  colors: typeof themeColors[ThemeName];
}) {
  const isPlayful = themeName === 'confetti';
  
  return (
    <div 
      className={`p-4 ${isPlayful ? 'rounded-xl border-2 shadow-[3px_3px_0px_0px_#1E293B]' : 'rounded-lg'}`}
      style={{ 
        backgroundColor: colors.bg.elevated,
        borderColor: isPlayful ? colors.text.primary : 'transparent',
      }}
    >
      <h4 className="mb-2 font-semibold" style={{ color: colors.text.primary }}>{title}</h4>
      <p className="text-sm" style={{ color: colors.text.secondary, lineHeight: 1.6 }}>{description}</p>
    </div>
  );
}
