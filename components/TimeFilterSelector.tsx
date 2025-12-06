"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock } from "lucide-react";
import { ThemeName } from "@/lib/themes";

/**
 * Time filter mode options
 */
export type TimeFilterModeOption = 'depart_now' | 'leave_by' | 'arrive_by';

/**
 * Time filter dropdown options
 */
const TIME_FILTER_OPTIONS: { value: TimeFilterModeOption; label: string }[] = [
  { value: 'depart_now', label: 'Depart Now' },
  { value: 'leave_by', label: 'Leave By' },
  { value: 'arrive_by', label: 'Arrive By' },
];

interface TimeFilterSelectorProps {
  value: TimeFilterModeOption;
  onChange: (mode: TimeFilterModeOption) => void;
  themeName: ThemeName;
}

/**
 * TimeFilterSelector Component
 * 
 * A dropdown component for selecting time filter mode:
 * - "Depart Now" - Show upcoming trains (default behavior)
 * - "Leave By" - Filter trains departing before a specified time
 * - "Arrive By" - Filter trains arriving before a specified time
 * 
 * Requirements: 4.1
 */
export default function TimeFilterSelector({ value, onChange, themeName }: TimeFilterSelectorProps) {
  const isSwiss = themeName === "swiss" || themeName === "swiss-dark";
  const isSwissDark = themeName === "swiss-dark";
  const isConfetti = themeName === "confetti";
  const isMinimalist = themeName === "minimalist";

  // Get theme-specific styles for the trigger
  const getTriggerStyles = () => {
    if (isSwiss) {
      if (isSwissDark) {
        return "h-10 bg-[#1F2937] border-2 border-[#374151] text-[#F9FAFB] font-medium rounded-md focus:border-[#F87171] focus:ring-2 focus:ring-[#F87171] focus:ring-offset-2 focus:ring-offset-[#111827] transition-all text-sm";
      }
      return "h-10 bg-white border-2 border-[#E5E7EB] text-[#111827] font-medium rounded-md focus:border-[#E31837] focus:ring-2 focus:ring-[#E31837] focus:ring-offset-2 transition-all text-sm";
    }
    if (isConfetti) {
      return "h-10 border-2 border-[#1E293B] bg-white text-[#1E293B] font-medium rounded-xl shadow-[3px_3px_0px_0px_#1E293B] focus:shadow-[4px_4px_0px_0px_#8B5CF6] focus:border-[#8B5CF6] transition-all text-sm";
    }
    if (isMinimalist) {
      return "h-10 bg-white border-2 border-black text-black font-bold uppercase text-xs tracking-[0.1em] focus:border-[#FF3000] focus:outline-none transition-all duration-150 rounded-none";
    }
    // Sketch theme
    if (themeName === "napkin") {
      return "h-9 bg-white border-[3px] border-[#2d2d2d] text-[#2d2d2d] shadow-[3px_3px_0px_0px_#2d2d2d] focus:shadow-[2px_2px_0px_0px_#2d2d2d] transition-all duration-100 text-sm font-[var(--font-patrick-hand)]";
    }
    // Default (linear)
    return "h-9 bg-[#0f0f12] border border-white/[0.10] text-[#EDEDEF] rounded-md focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2] transition-all text-sm";
  };

  // Get theme-specific styles for the content dropdown
  const getContentStyles = () => {
    if (isSwiss) {
      if (isSwissDark) {
        return "bg-[#1F2937] border-2 border-[#374151] rounded-md";
      }
      return "bg-white border-2 border-[#E5E7EB] rounded-md";
    }
    if (isConfetti) {
      return "bg-white border-2 border-[#1E293B] rounded-xl shadow-[4px_4px_0px_0px_#E2E8F0]";
    }
    if (isMinimalist) {
      return "bg-white border-4 border-black rounded-none";
    }
    // Sketch theme
    if (themeName === "napkin") {
      return "bg-white border-[3px] border-[#2d2d2d] shadow-[3px_3px_0px_0px_#2d2d2d]";
    }
    // Default (linear)
    return "bg-gray-800 border-gray-700 rounded-md";
  };

  // Get theme-specific styles for items
  const getItemStyles = () => {
    if (isSwiss) {
      if (isSwissDark) {
        return "font-medium text-[#E5E7EB] hover:bg-[#F87171] hover:text-white focus:bg-[#F87171] focus:text-white rounded-md";
      }
      return "font-medium hover:bg-[#E31837] hover:text-white focus:bg-[#E31837] focus:text-white rounded-md";
    }
    if (isConfetti) {
      return "font-medium hover:bg-[#FBBF24] focus:bg-[#FBBF24] rounded-lg";
    }
    if (isMinimalist) {
      return "hover:bg-[#FF3000] hover:text-white focus:bg-[#FF3000] focus:text-white text-black font-bold uppercase text-xs tracking-wider rounded-none transition-all duration-150";
    }
    // Default
    return "hover:bg-gray-700 focus:bg-gray-700 rounded-md";
  };

  // Get icon color based on theme
  const getIconColor = () => {
    if (isSwiss) return isSwissDark ? "text-[#F87171]" : "text-[#E31837]";
    if (isConfetti) return "text-[#8B5CF6]";
    if (isMinimalist) return "text-[#FF3000]";
    return "text-[#5E6AD2]";
  };

  return (
    <div className="flex items-center gap-2">
      <Clock className={`w-4 h-4 ${getIconColor()}`} strokeWidth={2} />
      <Select value={value} onValueChange={(v) => onChange(v as TimeFilterModeOption)}>
        <SelectTrigger className={getTriggerStyles()}>
          <SelectValue placeholder="Select time filter" />
        </SelectTrigger>
        <SelectContent className={getContentStyles()}>
          {TIME_FILTER_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className={getItemStyles()}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
