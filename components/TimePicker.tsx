"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { getFutureQuickSelectTimes, QuickSelectTime } from "@/lib/timeFilterUtils";

interface TimePickerProps {
  value: Date;
  onChange: (time: Date) => void;
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
 * Uses the unified theme system from ThemeContext
 */
export default function TimePicker({ value, onChange }: TimePickerProps) {
  const { theme, themeName } = useTheme();
  const isMinimalist = themeName === "minimalist";
  const isNapkin = themeName === "napkin";
  const isConfetti = themeName === "confetti";

  // Get future quick select times, updating every minute
  const [quickSelectTimes, setQuickSelectTimes] = useState<QuickSelectTime[]>([]);
  
  useEffect(() => {
    const updateQuickSelectTimes = () => {
      setQuickSelectTimes(getFutureQuickSelectTimes(new Date()));
    };
    
    updateQuickSelectTimes();
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

  // Check if a quick select time matches the current value
  const isQuickSelectActive = (quickTime: QuickSelectTime): boolean => {
    return value.getHours() === quickTime.hour && value.getMinutes() === quickTime.minute;
  };

  // Get border radius based on theme
  const getBorderRadius = () => {
    if (isMinimalist) return "0";
    if (isNapkin) return "40px 8px 45px 6px / 8px 42px 7px 40px";
    return undefined;
  };

  // Get quick select button styles
  const getQuickSelectStyles = (isActive: boolean) => {
    const baseClass = "px-3 py-1.5 text-xs font-medium transition-all";
    
    if (isActive) {
      if (isConfetti) {
        return `${baseClass} rounded-full border-2 border-[#1E293B] font-bold shadow-[2px_2px_0px_0px_#1E293B]`;
      }
      if (isNapkin) {
        return `${baseClass} border-[3px] border-[#2d2d2d] shadow-[2px_2px_0px_0px_#2d2d2d] font-bold font-[var(--font-patrick-hand)]`;
      }
      if (isMinimalist) {
        return `${baseClass} border-2 border-black font-bold uppercase tracking-widest`;
      }
      return `${baseClass} rounded-md border`;
    }
    
    // Inactive styles
    if (isConfetti) {
      return `${baseClass} rounded-full border-2 border-[#1E293B] font-bold shadow-[2px_2px_0px_0px_#1E293B] hover:-translate-y-0.5`;
    }
    if (isNapkin) {
      return `${baseClass} border-2 border-[#2d2d2d] font-bold font-[var(--font-patrick-hand)] hover:bg-[#e5e0d8]`;
    }
    if (isMinimalist) {
      return `${baseClass} border-2 border-black font-bold uppercase tracking-widest hover:bg-[#FF3000] hover:text-white`;
    }
    return `${baseClass} rounded-md border hover:opacity-80`;
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Time input */}
      <div className="flex items-center gap-2">
        <Clock 
          className={`w-4 h-4 ${theme.classes.textMuted}`} 
          strokeWidth={2} 
        />
        <input
          type="time"
          value={formatTimeForInput(value)}
          onChange={handleTimeChange}
          className={`h-10 px-3 ${theme.classes.input} text-sm font-medium focus:outline-none`}
          style={{ borderRadius: getBorderRadius() }}
        />
      </div>
      
      {/* Quick select buttons */}
      {quickSelectTimes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickSelectTimes.map((quickTime) => {
            const isActive = isQuickSelectActive(quickTime);
            return (
              <button
                key={quickTime.hour}
                onClick={() => handleQuickSelect(quickTime)}
                className={getQuickSelectStyles(isActive)}
                style={{
                  backgroundColor: isActive ? theme.raw.accent.primary : theme.raw.bg.secondary,
                  color: isActive ? '#FFFFFF' : theme.raw.text.muted,
                  borderColor: isActive ? theme.raw.accent.primary : theme.raw.border.primary,
                  borderRadius: getBorderRadius(),
                }}
              >
                {quickTime.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
