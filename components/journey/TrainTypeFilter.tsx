"use client";

import { useTheme } from "@/lib/ThemeContext";
import { getTrainTypeStyle } from "@/lib/themes";

interface TrainTypeFilterProps {
  filters: Record<string, boolean>;
  onToggle: (trainType: string) => void;
}

/**
 * TrainTypeFilter - Filter badges for train types (Local, Limited, Bullet)
 * Uses the unified theme system from ThemeContext
 */
export default function TrainTypeFilter({ filters, onToggle }: TrainTypeFilterProps) {
  const { theme, themeName } = useTheme();
  const isSwiss = themeName === "swiss" || themeName === "swiss-dark";
  const isSwissDark = themeName === "swiss-dark";
  const isConfetti = themeName === "confetti";
  const isMinimalist = themeName === "minimalist";

  const trainTypes = ['Local', 'Limited', 'Bullet'] as const;

  const getButtonStyles = (trainType: string, isEnabled: boolean) => {
    const trainStyle = getTrainTypeStyle(theme, trainType);
    
    if (isEnabled) {
      // Active state - use train type colors
      if (isConfetti) {
        return {
          className: 'border-2 font-bold rounded-full border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B]',
          style: { backgroundColor: trainStyle.bg, color: trainStyle.text }
        };
      }
      if (isMinimalist) {
        return {
          className: 'border-2 uppercase tracking-widest font-bold border-black',
          style: { backgroundColor: trainStyle.bg, color: trainStyle.text, borderRadius: 0 }
        };
      }
      return {
        className: 'rounded-full',
        style: { backgroundColor: trainStyle.bg, color: trainStyle.text }
      };
    }
    
    // Inactive state
    if (isSwiss) {
      return {
        className: `rounded-full ${isSwissDark ? 'bg-[#374151] text-[#6B7280]' : 'bg-[#F3F4F6] text-[#6B7280]'}`,
        style: {}
      };
    }
    if (isConfetti) {
      return {
        className: 'border-2 font-bold rounded-full bg-white text-[#64748B] border-[#E2E8F0]',
        style: {}
      };
    }
    if (isMinimalist) {
      return {
        className: 'border-2 uppercase tracking-widest font-bold bg-white text-[#666666] border-black',
        style: { borderRadius: 0 }
      };
    }
    // Obsidian/default
    return {
      className: 'rounded-full bg-white/5 text-white/40 border border-white/10',
      style: {}
    };
  };

  return (
    <div className="flex items-center gap-2 ml-auto">
      <span className={`text-xs ${theme.classes.textMuted} mr-1`}>Show:</span>
      {trainTypes.map((trainType) => {
        const isEnabled = filters[trainType];
        const { className, style } = getButtonStyles(trainType, isEnabled);
        
        return (
          <button
            key={trainType}
            onClick={() => onToggle(trainType)}
            className={`px-3 py-1.5 text-xs font-medium border transition-all duration-150 ${className} ${!isEnabled ? 'opacity-60' : ''}`}
            style={style}
          >
            {trainType}
          </button>
        );
      })}
    </div>
  );
}
