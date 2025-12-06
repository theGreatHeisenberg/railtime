"use client";

import { useState, useEffect, useMemo } from "react";
import { Clock } from "lucide-react";
import { ThemeName } from "@/lib/themes";
import { getNextHourRoundedUp, getFutureQuickSelectTimes, QuickSelectTime } from "@/lib/timeFilterUtils";

interface TimePickerProps {
  value: Date;
  onChange: (time: Date) => void;
  themeName: ThemeName;
}

/**
 * TimePicker Component
 * 
 * A time input component with:
 * - Hour/minute selection
 * - Quick-select buttons for common times (9 AM, 12 PM, 5 PM, 6 PM)
 * - Only shows future times in quick-select
 * - Defaults to next hour rounded up
 * 
 * Requirements: 4.2, 4.5, 6.1, 6.2, 6.3, 6.4
 */
export default function TimePicker({ value, onChange, themeName }: TimePickerProps) {
  const isSwiss = themeName === "swiss" || themeName === "swiss-dark";
  const isSwissDark = themeName === "swiss-dark";
  const isConfetti = themeName === "confetti";
  const isMinimalist = themeName === "minimalist";

  // Get future quick select times, updating every minute
  const [quickSelectTimes, setQuickSelectTimes] = useState<QuickSelectTime[]>([]);
  
  useEffect(() => {
    const updateQuickSelectTimes = () => {
      setQuickSelectTimes(getFutureQuickSelectTimes(new Date()));
    };
    
    updateQuickSelectTimes();
    // Update every minute to keep quick select times current
    const interval = setInterval(updateQuickSelectTimes, 60000);
    return () => clearInterval(interval);
  }, []);

  // Format time for display in input
  const formatTimeForInput = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Handle time input change
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(':').map(Number);
    const newDate = new Date(value);
    newDate.setHours(hours, minutes, 0, 0);
    
    // If the selected time is in the past today, move to tomorrow
    const now = new Date();
    if (newDate <= now) {
      newDate.setDate(newDate.getDate() + 1);
    }
    
    onChange(newDate);
  };

  // Handle quick select button click
  const handleQuickSelect = (quickTime: QuickSelectTime) => {
    const newDate = new Date();
    newDate.setHours(quickTime.hour, quickTime.minute, 0, 0);
    
    // If the selected time is in the past today, move to tomorrow
    const now = new Date();
    if (newDate <= now) {
      newDate.setDate(newDate.getDate() + 1);
    }
    
    onChange(newDate);
  };

  // Get theme-specific styles for the time input
  const getInputStyles = () => {
    if (isSwiss) {
      if (isSwissDark) {
        return "h-10 px-3 bg-[#1F2937] border-2 border-[#374151] text-[#F9FAFB] font-medium rounded-md focus:border-[#F87171] focus:ring-2 focus:ring-[#F87171] focus:ring-offset-2 focus:ring-offset-[#111827] focus:outline-none transition-all text-sm";
      }
      return "h-10 px-3 bg-white border-2 border-[#E5E7EB] text-[#111827] font-medium rounded-md focus:border-[#E31837] focus:ring-2 focus:ring-[#E31837] focus:ring-offset-2 focus:outline-none transition-all text-sm";
    }
    if (isConfetti) {
      return "h-10 px-3 border-2 border-[#1E293B] bg-white text-[#1E293B] font-medium rounded-xl shadow-[3px_3px_0px_0px_#1E293B] focus:shadow-[4px_4px_0px_0px_#8B5CF6] focus:border-[#8B5CF6] focus:outline-none transition-all text-sm";
    }
    // Sketch theme
    if (themeName === "napkin") {
      return "h-9 px-3 bg-white border-[3px] border-[#2d2d2d] text-[#2d2d2d] shadow-[3px_3px_0px_0px_#2d2d2d] focus:shadow-[2px_2px_0px_0px_#2d2d2d] focus:translate-x-[1px] focus:translate-y-[1px] focus:outline-none transition-all duration-100 text-sm font-[var(--font-patrick-hand)]";
    }
    // Default (linear)
    return "h-9 px-3 bg-[#0f0f12] border border-white/[0.10] text-[#EDEDEF] rounded-md focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2] focus:outline-none transition-all text-sm";
  };

  // Get theme-specific styles for quick select buttons
  const getQuickSelectStyles = (isActive: boolean) => {
    if (isSwiss) {
      if (isSwissDark) {
        return isActive
          ? "px-3 py-1.5 bg-[#F87171] text-white rounded-md text-xs font-semibold transition-all"
          : "px-3 py-1.5 bg-[#374151] text-[#9CA3AF] hover:bg-[#F87171] hover:text-white rounded-md text-xs font-semibold transition-all";
      }
      return isActive
        ? "px-3 py-1.5 bg-[#E31837] text-white rounded-md text-xs font-semibold transition-all"
        : "px-3 py-1.5 bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E31837] hover:text-white rounded-md text-xs font-semibold transition-all";
    }
    if (isConfetti) {
      return isActive
        ? "px-3 py-1.5 bg-[#8B5CF6] text-white border-2 border-[#1E293B] rounded-full text-xs font-bold shadow-[2px_2px_0px_0px_#1E293B] transition-all"
        : "px-3 py-1.5 bg-white text-[#1E293B] border-2 border-[#1E293B] rounded-full text-xs font-bold shadow-[2px_2px_0px_0px_#1E293B] hover:bg-[#FBBF24] hover:-translate-y-0.5 transition-all";
    }
    // Sketch theme
    if (themeName === "napkin") {
      return isActive
        ? "px-3 py-1.5 bg-[#ff4d4d] text-white border-[3px] border-[#2d2d2d] shadow-[2px_2px_0px_0px_#2d2d2d] text-xs font-bold transition-all duration-100 font-[var(--font-patrick-hand)]"
        : "px-3 py-1.5 bg-white text-[#2d2d2d]/60 border-2 border-[#2d2d2d] hover:bg-[#e5e0d8] text-xs font-bold transition-all duration-100 font-[var(--font-patrick-hand)]";
    }
    // Default (linear)
    return isActive
      ? "px-3 py-1.5 bg-[#5E6AD2]/20 text-[#5E6AD2] border border-[#5E6AD2]/30 rounded-md text-xs font-medium transition-all"
      : "px-3 py-1.5 bg-white/[0.05] text-[#8A8F98] border border-white/[0.06] hover:bg-white/[0.08] hover:text-[#EDEDEF] rounded-md text-xs font-medium transition-all";
  };

  // Check if a quick select time matches the current value
  const isQuickSelectActive = (quickTime: QuickSelectTime): boolean => {
    return value.getHours() === quickTime.hour && value.getMinutes() === quickTime.minute;
  };

  // Get icon color based on theme
  const getIconColor = () => {
    if (isSwiss) return isSwissDark ? "text-[#9CA3AF]" : "text-[#6B7280]";
    if (isConfetti) return "text-[#64748B]";
    return "text-[#8A8F98]";
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Time input */}
      <div className="flex items-center gap-2">
        <Clock className={`w-4 h-4 ${getIconColor()}`} strokeWidth={2} />
        <input
          type="time"
          value={formatTimeForInput(value)}
          onChange={handleTimeChange}
          className={getInputStyles()}
        />
      </div>
      
      {/* Quick select buttons */}
      {quickSelectTimes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickSelectTimes.map((quickTime) => (
            <button
              key={quickTime.hour}
              onClick={() => handleQuickSelect(quickTime)}
              className={getQuickSelectStyles(isQuickSelectActive(quickTime))}
            >
              {quickTime.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
