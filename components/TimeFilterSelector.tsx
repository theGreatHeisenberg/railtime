"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

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
}

/**
 * TimeFilterSelector Component
 * 
 * A dropdown component for selecting time filter mode:
 * - "Depart Now" - Show upcoming trains (default behavior)
 * - "Leave By" - Filter trains departing before a specified time
 * - "Arrive By" - Filter trains arriving before a specified time
 * 
 * Uses the unified theme system from ThemeContext
 */
export default function TimeFilterSelector({ value, onChange }: TimeFilterSelectorProps) {
  const { theme, themeName } = useTheme();
  const isMinimalist = themeName === "minimalist";
  const isNapkin = themeName === "napkin";

  // Get border radius based on theme
  const getBorderRadius = () => {
    if (isMinimalist) return "0";
    if (isNapkin) return "40px 8px 45px 6px / 8px 42px 7px 40px";
    return undefined;
  };

  return (
    <div className="flex items-center gap-2">
      <Clock 
        className="w-4 h-4" 
        style={{ color: theme.raw.accent.primary }} 
        strokeWidth={2} 
      />
      <Select value={value} onValueChange={(v) => onChange(v as TimeFilterModeOption)}>
        <SelectTrigger 
          className={`h-10 ${theme.classes.input} text-sm font-medium`}
          style={{ borderRadius: getBorderRadius() }}
        >
          <SelectValue placeholder="Select time filter" />
        </SelectTrigger>
        <SelectContent 
          className={theme.classes.card}
          style={{ borderRadius: getBorderRadius() }}
        >
          {TIME_FILTER_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="font-medium"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
