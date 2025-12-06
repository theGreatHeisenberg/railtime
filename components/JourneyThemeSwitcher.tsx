"use client";

import { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { themes, ThemeName } from "@/lib/themes";
import { Palette } from "lucide-react";

export default function JourneyThemeSwitcher() {
  const { themeName, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  // Theme icons for visual distinction
  const themeIcons: Record<ThemeName, string> = {
    swiss: "■",
    "swiss-dark": "■",
    obsidian: "✦",
    napkin: "✏️",
    confetti: "🎨",
    minimalist: "▢",
  };
  
  const isSwissDark = themeName === "swiss-dark";
  const isMinimalist = themeName === "minimalist";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 transition-all duration-200 ${
          themeName === "swiss"
            ? "bg-[#3B82F6] text-white rounded-md hover:bg-[#2563EB] hover:scale-105 active:scale-100"
            : isSwissDark
              ? "bg-[#F87171] text-white rounded-md hover:bg-[#EF4444] hover:scale-105 active:scale-100"
              : isMinimalist
                ? "bg-black text-white border-2 border-black hover:bg-[#FF3000] hover:border-[#FF3000] transition-all duration-150 font-inter uppercase text-xs tracking-wider"
                : themeName === "obsidian"
                  ? "bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.06] text-[#EDEDEF] hover:bg-white/[0.08] hover:border-white/[0.10] rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_2px_10px_rgba(0,0,0,0.3)]"
                  : themeName === "napkin"
                    ? "bg-white border-[3px] border-[#2d2d2d] text-[#2d2d2d] shadow-[4px_4px_0px_0px_#2d2d2d] hover:shadow-[2px_2px_0px_0px_#2d2d2d] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-100 font-[var(--font-patrick-hand)]"
                    : "bg-white border-2 border-[#1E293B] text-[#8B5CF6] rounded-full shadow-[4px_4px_0px_0px_#1E293B] hover:shadow-[6px_6px_0px_0px_#1E293B] hover:-translate-x-[2px] hover:-translate-y-[2px] active:shadow-[2px_2px_0px_0px_#1E293B] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-300"
        }`}
        title="Change theme"
      >
        <span className="text-sm">{themeIcons[themeName]}</span>
        <Palette className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div
            className={`absolute right-0 mt-2 w-44 overflow-hidden z-50 ${
              themeName === "swiss"
                ? "bg-white rounded-lg"
                : isSwissDark
                  ? "bg-[#1F2937] rounded-lg border border-[#374151]"
                  : isMinimalist
                    ? "bg-white border-4 border-black"
                    : themeName === "obsidian"
                      ? "bg-[#0a0a0c] border border-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_40px_rgba(0,0,0,0.5),0_0_60px_rgba(94,106,210,0.1)] rounded-xl backdrop-blur-xl"
                      : themeName === "napkin"
                        ? "bg-white border-[3px] border-[#2d2d2d] shadow-[6px_6px_0px_0px_#2d2d2d]"
                        : "bg-white border-2 border-[#1E293B] shadow-[8px_8px_0px_0px_#E2E8F0] rounded-2xl"
            }`}
          >
            <div
              className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-widest border-b ${
                themeName === "swiss"
                  ? "text-[#6B7280] border-[#E5E7EB]"
                  : isSwissDark
                    ? "text-[#9CA3AF] border-[#374151]"
                    : isMinimalist
                      ? "text-black border-black border-b-2 font-bold tracking-[0.2em]"
                      : themeName === "obsidian"
                        ? "text-[#8A8F98] border-white/[0.06]"
                        : themeName === "napkin"
                          ? "text-[#2d2d2d] border-[#2d2d2d]/30 font-[var(--font-patrick-hand)] border-dashed"
                          : "text-[#64748B] border-[#E2E8F0] font-bold uppercase tracking-wide"
              }`}
            >
              Theme
            </div>
            <div className="p-1.5 space-y-0.5">
              {(Object.keys(themes) as ThemeName[]).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setTheme(key);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-all flex items-center gap-2 ${
                    themeName === "swiss" || isSwissDark ? "rounded-md" : isMinimalist ? "" : "rounded-lg"
                  } ${
                    themeName === key
                      ? themeName === "swiss"
                        ? "bg-[#3B82F6] text-white font-medium"
                        : isSwissDark
                          ? "bg-[#F87171] text-white font-medium"
                          : isMinimalist
                            ? "bg-black text-white font-bold uppercase text-xs tracking-wider"
                            : themeName === "obsidian"
                              ? "bg-[#5E6AD2]/20 text-[#EDEDEF] font-medium"
                              : themeName === "napkin"
                                ? "bg-[#ff4d4d] text-white font-[var(--font-patrick-hand)] border-2 border-[#2d2d2d] shadow-[2px_2px_0px_0px_#2d2d2d]"
                                : "bg-[#8B5CF6] text-white font-bold shadow-[2px_2px_0px_0px_#1E293B]"
                      : themeName === "swiss"
                        ? "text-[#111827] hover:bg-[#F3F4F6]"
                        : isSwissDark
                          ? "text-[#E5E7EB] hover:bg-[#374151]"
                          : isMinimalist
                            ? "text-black hover:bg-[#FF3000] hover:text-white uppercase text-xs tracking-wider transition-all duration-150"
                            : themeName === "obsidian"
                              ? "text-[#8A8F98] hover:bg-white/[0.05] hover:text-[#EDEDEF]"
                              : themeName === "napkin"
                                ? "text-[#2d2d2d] hover:bg-[#e5e0d8] font-[var(--font-patrick-hand)]"
                                : "text-[#1E293B] hover:bg-[#FBBF24] font-medium"
                  }`}
                >
                  <span>{themeIcons[key]}</span>
                  <span>{themes[key].label.replace(/^[^\s]+\s/, "")}</span>
                  {themeName === key && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
