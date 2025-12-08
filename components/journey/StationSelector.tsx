"use client";

import { ArrowLeftRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/lib/ThemeContext";
import { Station } from "@/lib/types";

interface StationSelectorProps {
  origin: string;
  destination: string;
  stations: Station[];
  onOriginChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onSwap: () => void;
}

/**
 * StationSelector - Origin/Destination selection with swap button
 * Uses the unified theme system from ThemeContext
 */
export default function StationSelector({
  origin,
  destination,
  stations,
  onOriginChange,
  onDestinationChange,
  onSwap,
}: StationSelectorProps) {
  const { theme, themeName } = useTheme();
  const isNapkin = themeName === "napkin";
  const isMinimalist = themeName === "minimalist";

  // Get border radius style
  const borderRadius = isMinimalist ? "0" : isNapkin ? "95px 4px 97px 5px / 4px 95px 6px 95px" : undefined;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 lg:gap-4 relative">
      {/* Origin Select */}
      <div className="flex-1 min-w-0">
        <label className={`text-[10px] ${theme.classes.textMuted} uppercase tracking-widest font-medium mb-1.5 block`}>
          From
        </label>
        <Select value={origin} onValueChange={onOriginChange}>
          <SelectTrigger 
            className={`w-full h-11 ${theme.classes.input} font-medium`}
            style={{ borderRadius }}
          >
            <SelectValue placeholder="Origin" />
          </SelectTrigger>
          <SelectContent 
            className={theme.classes.card}
            style={{ borderRadius }}
          >
            {stations.map((s) => (
              <SelectItem 
                key={s.stop1} 
                value={s.stopname} 
                disabled={s.stopname === destination}
              >
                {s.stopname}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Swap Button */}
      <button
        onClick={onSwap}
        className={`self-center sm:self-auto flex-shrink-0 w-11 h-11 ${theme.classes.buttonPrimary} transition-all hover:scale-105 flex items-center justify-center`}
        style={{ borderRadius: isMinimalist ? "0" : undefined }}
        aria-label="Swap stations"
      >
        <ArrowLeftRight className="w-4 h-4 text-white" />
      </button>

      {/* Destination Select */}
      <div className="flex-1 min-w-0">
        <label className={`text-[10px] ${theme.classes.textMuted} uppercase tracking-widest font-medium mb-1.5 block`}>
          To
        </label>
        <Select value={destination} onValueChange={onDestinationChange}>
          <SelectTrigger 
            className={`w-full h-11 ${theme.classes.input} font-medium`}
            style={{ borderRadius }}
          >
            <SelectValue placeholder="Destination" />
          </SelectTrigger>
          <SelectContent 
            className={theme.classes.card}
            style={{ borderRadius }}
          >
            {stations.map((s) => (
              <SelectItem 
                key={s.stop1} 
                value={s.stopname} 
                disabled={s.stopname === origin}
              >
                {s.stopname}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
