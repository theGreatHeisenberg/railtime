"use client";

import { useTheme } from "@/lib/ThemeContext";
import { DataSource } from "@/lib/types";
import LiveStatusBadge from "../LiveStatusBadge";
import JourneyThemeSwitcher from "../JourneyThemeSwitcher";
import ServiceAlertsBanner from "../ServiceAlertsBanner";

interface JourneyHeaderProps {
  dataSource: DataSource | null;
  lastUpdated: Date | null;
}

/**
 * JourneyHeader - Logo, status badges, and theme switcher
 * Uses the unified theme system from ThemeContext
 */
export default function JourneyHeader({ dataSource, lastUpdated }: JourneyHeaderProps) {
  const { theme, themeName } = useTheme();
  const isSwiss = themeName === "swiss" || themeName === "swiss-dark";
  const isSwissDark = themeName === "swiss-dark";
  const isConfetti = themeName === "confetti";
  const isNapkin = themeName === "napkin";
  const isMinimalist = themeName === "minimalist";

  // Napkin wobbly border radius
  const wobblySm = "40px 8px 45px 6px / 8px 42px 7px 40px";

  return (
    <div className={`flex items-center justify-between mb-6 relative ${
      isSwiss ? (isSwissDark ? "pb-6 border-b border-[#F87171]/20" : "pb-6 border-b border-[#E31837]/20") :
      isConfetti ? "pb-6 border-b-2 border-[#E2E8F0]" :
      isNapkin ? "pb-6 border-b-[3px] border-dashed border-[#2d2d2d]/30" :
      isMinimalist ? "pb-6 border-b-4 border-black" : ""
    }`}>
      {/* Background glow for Swiss theme */}
      {isSwiss && (
        <div className={`absolute -top-4 -left-4 w-24 h-24 ${isSwissDark ? "bg-[#F87171]/5" : "bg-[#E31837]/5"} rounded-full blur-2xl pointer-events-none`} />
      )}

      {/* Logo Section */}
      <div className="flex items-center gap-3 relative">
        {/* Logo Icon */}
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
        ) : isNapkin ? (
          <div className="flex items-center gap-1 p-2 bg-white border-[3px] border-[#2d2d2d] shadow-[3px_3px_0px_0px_#2d2d2d] rotate-[-2deg]" style={{ borderRadius: wobblySm }}>
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
            <div className={`w-1.5 h-7 rounded-full opacity-90`} style={{ backgroundColor: theme.raw.accent.primary }} />
            <div className={`w-1.5 h-5 rounded-full opacity-60`} style={{ backgroundColor: theme.raw.accent.primary }} />
            <div className={`w-1.5 h-3 rounded-full opacity-30`} style={{ backgroundColor: theme.raw.accent.primary }} />
          </div>
        )}

        {/* Logo Text */}
        <div>
          <h1 className={`text-xl lg:text-2xl font-bold tracking-tight ${theme.classes.textPrimary} ${
            isSwiss ? "text-2xl lg:text-3xl" :
            isConfetti ? "text-2xl lg:text-3xl" :
            isNapkin ? "text-2xl lg:text-3xl font-[var(--font-kalam)]" :
            isMinimalist ? "text-3xl lg:text-4xl font-black uppercase tracking-tight" : ""
          }`}>
            {theme.typography.logoText}
          </h1>
          <p className={`text-[11px] ${theme.classes.textMuted}`}>Caltrain Tracker</p>
        </div>
      </div>

      {/* Right Side - Status & Controls */}
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          {dataSource && <LiveStatusBadge dataSource={dataSource} size="sm" />}
          <JourneyThemeSwitcher />
          <ServiceAlertsBanner />
        </div>
        {lastUpdated && (
          <span className={`text-[9px] ${theme.classes.textMuted}`}>
            Last updated at {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}
