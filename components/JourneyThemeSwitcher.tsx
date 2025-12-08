"use client";

import { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { themes, ThemeName, getBorderRadius } from "@/lib/themes";
import { Palette } from "lucide-react";

export default function JourneyThemeSwitcher() {
  const { theme, themeName, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const { raw, classes, styles } = theme;
  const borderRadius = getBorderRadius(theme);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 transition-all duration-200 ${classes.buttonSecondary}`}
        style={{ borderRadius }}
        title="Change theme"
      >
        <span className="text-sm">{theme.icon}</span>
        <Palette className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className={`absolute right-0 mt-2 w-44 overflow-hidden z-50 ${classes.card}`}
            style={{ borderRadius }}
          >
            <div className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-widest border-b ${classes.textMuted} ${classes.divider}`}>
              Theme
            </div>
            <div className="p-1.5 space-y-0.5">
              {(Object.keys(themes) as ThemeName[]).map((key) => {
                const t = themes[key];
                const isActive = themeName === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setTheme(key); setIsOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-all flex items-center gap-2`}
                    style={{
                      borderRadius: styles.isRounded ? '0.375rem' : '0',
                      backgroundColor: isActive ? raw.accent.primary : 'transparent',
                      color: isActive ? '#FFFFFF' : raw.text.primary,
                    }}
                  >
                    <span>{t.icon}</span>
                    <span className={isActive ? 'font-medium' : ''}>{t.label}</span>
                    {isActive && <span className="ml-auto text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
