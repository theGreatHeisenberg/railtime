"use client";

import { DataSource } from "@/lib/types";
import { useTheme } from "@/lib/ThemeContext";

interface LiveStatusBadgeProps {
  dataSource: DataSource;
  size?: "sm" | "md" | "lg";
}

/**
 * LiveStatusBadge - Displays data freshness status as a badge
 * 
 * - Green pulsing "LIVE" badge for realtime data (Requirements 8.1)
 * - Gray "SCHEDULED" badge for static data
 * - Blue "PARTIAL" badge for mixed data
 */
export default function LiveStatusBadge({ dataSource, size = "md" }: LiveStatusBadgeProps) {
  const { themeName } = useTheme();
  const isSwiss = themeName === "swiss" || themeName === "swiss-dark";
  const isSwissDark = themeName === "swiss-dark";
  const isObsidian = themeName === "obsidian";
  const isNapkin = themeName === "napkin";
  const isConfetti = themeName === "confetti";
  const isMinimalist = themeName === "minimalist";
  
  const sizeClasses = {
    sm: isSwiss ? "text-[10px] px-2.5 py-1" : isObsidian ? "text-[10px] px-2 py-0.5" : isNapkin ? "text-[10px] px-2 py-0.5 font-[var(--font-patrick-hand)]" : isMinimalist ? "text-[9px] px-2 py-0.5 tracking-[0.15em] font-bold" : isConfetti ? "text-[10px] px-2.5 py-1" : "text-[10px] px-1.5 py-0.5",
    md: isSwiss ? "text-xs px-3 py-1.5" : isObsidian ? "text-[11px] px-2.5 py-1" : isNapkin ? "text-[11px] px-3 py-1 font-[var(--font-patrick-hand)]" : isMinimalist ? "text-[10px] px-3 py-1 tracking-[0.15em] font-bold" : isConfetti ? "text-xs px-3 py-1.5" : "text-xs px-2 py-0.5",
    lg: isSwiss ? "text-sm px-4 py-2" : isObsidian ? "text-xs px-3 py-1.5" : isNapkin ? "text-xs px-4 py-1.5 font-[var(--font-patrick-hand)]" : isMinimalist ? "text-xs px-4 py-1.5 tracking-[0.15em] font-bold" : isConfetti ? "text-sm px-4 py-2" : "text-sm px-2.5 py-1",
  };

  const getBadgeConfig = () => {
    if (isSwiss) {
      // Flat dark mode colors
      if (isSwissDark) {
        switch (dataSource.type) {
          case "realtime":
            return {
              label: "LIVE",
              bgColor: "bg-[#34D399]",
              textColor: "text-white",
              borderColor: "border-transparent",
              pulse: true,
              pulseColor: "bg-white",
            };
          case "static":
            return {
              label: "SCHEDULED",
              bgColor: "bg-[#374151]",
              textColor: "text-[#9CA3AF]",
              borderColor: "border-transparent",
              pulse: false,
              pulseColor: "",
            };
          case "mixed":
            return {
              label: "PARTIAL",
              bgColor: "bg-[#F87171]",
              textColor: "text-white",
              borderColor: "border-transparent",
              pulse: false,
              pulseColor: "",
            };
          case "cached":
            return {
              label: "CACHED",
              bgColor: "bg-[#FBBF24]",
              textColor: "text-[#111827]",
              borderColor: "border-transparent",
              pulse: false,
              pulseColor: "",
            };
          case "unavailable":
            return {
              label: "OFFLINE",
              bgColor: "bg-[#F87171]",
              textColor: "text-white",
              borderColor: "border-transparent",
              pulse: false,
              pulseColor: "",
            };
          default:
            return {
              label: "UNKNOWN",
              bgColor: "bg-[#374151]",
              textColor: "text-[#9CA3AF]",
              borderColor: "border-transparent",
              pulse: false,
              pulseColor: "",
            };
        }
      }
      // Flat light mode colors
      switch (dataSource.type) {
        case "realtime":
          return {
            label: "LIVE",
            bgColor: "bg-[#10B981]",
            textColor: "text-white",
            borderColor: "border-transparent",
            pulse: true,
            pulseColor: "bg-white",
          };
        case "static":
          return {
            label: "SCHEDULED",
            bgColor: "bg-[#F3F4F6]",
            textColor: "text-[#6B7280]",
            borderColor: "border-transparent",
            pulse: false,
            pulseColor: "",
          };
        case "mixed":
          return {
            label: "PARTIAL",
            bgColor: "bg-[#E31837]",
            textColor: "text-white",
            borderColor: "border-transparent",
            pulse: false,
            pulseColor: "",
          };
        case "cached":
          return {
            label: "CACHED",
            bgColor: "bg-[#F59E0B]",
            textColor: "text-[#111827]",
            borderColor: "border-transparent",
            pulse: false,
            pulseColor: "",
          };
        case "unavailable":
          return {
            label: "OFFLINE",
            bgColor: "bg-[#EF4444]",
            textColor: "text-white",
            borderColor: "border-transparent",
            pulse: false,
            pulseColor: "",
          };
        default:
          return {
            label: "UNKNOWN",
            bgColor: "bg-[#F3F4F6]",
            textColor: "text-[#6B7280]",
            borderColor: "border-transparent",
            pulse: false,
            pulseColor: "",
          };
      }
    }
    
    if (isObsidian) {
      switch (dataSource.type) {
        case "realtime":
          return {
            label: "LIVE",
            bgColor: "bg-emerald-500/15",
            textColor: "text-emerald-400",
            borderColor: "border-emerald-500/20",
            pulse: true,
            pulseColor: "bg-emerald-400",
          };
        case "static":
          return {
            label: "SCHEDULED",
            bgColor: "bg-white/[0.06]",
            textColor: "text-[#8A8F98]",
            borderColor: "border-white/[0.08]",
            pulse: false,
            pulseColor: "",
          };
        case "mixed":
          return {
            label: "PARTIAL",
            bgColor: "bg-[#5E6AD2]/15",
            textColor: "text-[#5E6AD2]",
            borderColor: "border-[#5E6AD2]/20",
            pulse: false,
            pulseColor: "",
          };
        case "cached":
          return {
            label: "CACHED",
            bgColor: "bg-amber-500/15",
            textColor: "text-amber-400",
            borderColor: "border-amber-500/20",
            pulse: false,
            pulseColor: "",
          };
        case "unavailable":
          return {
            label: "OFFLINE",
            bgColor: "bg-rose-500/15",
            textColor: "text-rose-400",
            borderColor: "border-rose-500/20",
            pulse: false,
            pulseColor: "",
          };
        default:
          return {
            label: "UNKNOWN",
            bgColor: "bg-white/[0.06]",
            textColor: "text-[#8A8F98]",
            borderColor: "border-white/[0.08]",
            pulse: false,
            pulseColor: "",
          };
      }
    }
    
    if (isNapkin) {
      switch (dataSource.type) {
        case "realtime":
          return {
            label: "LIVE",
            bgColor: "bg-[#2d5da1]",
            textColor: "text-white",
            borderColor: "border-[#2d2d2d] border-[3px]",
            pulse: true,
            pulseColor: "bg-white",
          };
        case "static":
          return {
            label: "SCHEDULED",
            bgColor: "bg-[#e5e0d8]",
            textColor: "text-[#2d2d2d]",
            borderColor: "border-[#2d2d2d] border-2",
            pulse: false,
            pulseColor: "",
          };
        case "mixed":
          return {
            label: "PARTIAL",
            bgColor: "bg-[#fff9c4]",
            textColor: "text-[#2d2d2d]",
            borderColor: "border-[#2d2d2d] border-2",
            pulse: false,
            pulseColor: "",
          };
        case "cached":
          return {
            label: "CACHED",
            bgColor: "bg-[#fff9c4]",
            textColor: "text-[#2d2d2d]",
            borderColor: "border-[#2d2d2d] border-2",
            pulse: false,
            pulseColor: "",
          };
        case "unavailable":
          return {
            label: "OFFLINE",
            bgColor: "bg-[#ff4d4d]",
            textColor: "text-white",
            borderColor: "border-[#2d2d2d] border-[3px]",
            pulse: false,
            pulseColor: "",
          };
        default:
          return {
            label: "UNKNOWN",
            bgColor: "bg-[#e5e0d8]",
            textColor: "text-[#2d2d2d]",
            borderColor: "border-[#2d2d2d] border-2",
            pulse: false,
            pulseColor: "",
          };
      }
    }
    
    if (isMinimalist) {
      // Swiss International: Black/White with Swiss Red accent
      switch (dataSource.type) {
        case "realtime":
          return {
            label: "LIVE",
            bgColor: "bg-black",
            textColor: "text-white",
            borderColor: "border-black border-2",
            pulse: true,
            pulseColor: "bg-[#FF3000]",
          };
        case "static":
          return {
            label: "SCHEDULED",
            bgColor: "bg-[#F2F2F2]",
            textColor: "text-black",
            borderColor: "border-black border-2",
            pulse: false,
            pulseColor: "",
          };
        case "mixed":
          return {
            label: "PARTIAL",
            bgColor: "bg-[#FF3000]",
            textColor: "text-white",
            borderColor: "border-black border-2",
            pulse: false,
            pulseColor: "",
          };
        case "cached":
          return {
            label: "CACHED",
            bgColor: "bg-[#F2F2F2]",
            textColor: "text-[#666666]",
            borderColor: "border-black border-2",
            pulse: false,
            pulseColor: "",
          };
        case "unavailable":
          return {
            label: "OFFLINE",
            bgColor: "bg-[#FF3000]",
            textColor: "text-white",
            borderColor: "border-black border-2",
            pulse: false,
            pulseColor: "",
          };
        default:
          return {
            label: "UNKNOWN",
            bgColor: "bg-[#F2F2F2]",
            textColor: "text-[#666666]",
            borderColor: "border-black border-2",
            pulse: false,
            pulseColor: "",
          };
      }
    }
    
    // Default: confetti theme
    switch (dataSource.type) {
      case "realtime":
        return {
          label: "LIVE",
          bgColor: "bg-[#34D399]",
          textColor: "text-white",
          borderColor: "border-[#1E293B]",
          pulse: true,
          pulseColor: "bg-white",
        };
      case "static":
        return {
          label: "SCHEDULED",
          bgColor: "bg-[#F1F5F9]",
          textColor: "text-[#64748B]",
          borderColor: "border-[#1E293B]",
          pulse: false,
          pulseColor: "",
        };
      case "mixed":
        return {
          label: "PARTIAL",
          bgColor: "bg-[#8B5CF6]",
          textColor: "text-white",
          borderColor: "border-[#1E293B]",
          pulse: false,
          pulseColor: "",
        };
      case "cached":
        return {
          label: "CACHED",
          bgColor: "bg-[#FBBF24]",
          textColor: "text-[#1E293B]",
          borderColor: "border-[#1E293B]",
          pulse: false,
          pulseColor: "",
        };
      case "unavailable":
        return {
          label: "OFFLINE",
          bgColor: "bg-[#F472B6]",
          textColor: "text-white",
          borderColor: "border-[#1E293B]",
          pulse: false,
          pulseColor: "",
        };
      default:
        return {
          label: "UNKNOWN",
          bgColor: "bg-[#F1F5F9]",
          textColor: "text-[#64748B]",
          borderColor: "border-[#1E293B]",
          pulse: false,
          pulseColor: "",
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium border
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizeClasses[size]}
        ${isSwiss ? "rounded-md font-medium uppercase tracking-wide" : "rounded-full"}
        ${isObsidian ? "backdrop-blur-sm font-medium tracking-wide" : ""}
        ${isNapkin ? "font-bold shadow-[2px_2px_0px_0px_#2d2d2d]" : ""}
        ${isMinimalist ? "rounded-none uppercase" : ""}
        ${isConfetti ? "border-2 font-bold shadow-[2px_2px_0px_0px_#1E293B]" : ""}
      `}
      role="status"
      aria-label={`Data status: ${config.label}`}
    >
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full ${isSwiss ? "rounded-full" : "rounded-full"} ${config.pulseColor} opacity-75`}></span>
          <span className={`relative inline-flex h-2 w-2 ${isSwiss ? "rounded-full bg-white" : isObsidian ? "rounded-full bg-emerald-400" : isNapkin ? "rounded-full bg-white" : isMinimalist ? "bg-[#FF3000]" : isConfetti ? "rounded-full bg-white" : "rounded-full bg-green-500"}`} style={isMinimalist ? { borderRadius: 0 } : undefined}></span>
        </span>
      )}
      {config.label}
    </span>
  );
}
