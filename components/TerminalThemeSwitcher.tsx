'use client';

import { useTheme } from '@/lib/ThemeContext';
import { themes, ThemeName } from '@/lib/themes';
import { useState } from 'react';

export default function TerminalThemeSwitcher() {
  const { theme, themeName, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 ${theme.colors.status.onTime} hover:${theme.colors.text.accent} transition-all ${theme.typography.fontFamily} text-xs tracking-widest ${theme.colors.ui.hover} px-3 py-2 border-2 ${theme.colors.ui.border} rounded animate-pulse-slow`}
        title="Change theme"
        style={{ boxShadow: `0 0 15px ${theme.colors.glow.replace('drop-shadow-[0_0_10px_', '').replace(']', '')}` }}
      >
        <span className="text-base">🎨</span>
        <span className="hidden sm:inline">THEMES</span>
        <span className="sm:hidden">[◆]</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className={`absolute right-0 mt-2 w-56 ${theme.colors.bg.primary} border-2 ${theme.colors.ui.border} shadow-lg z-50 rounded-lg overflow-hidden`} style={{ boxShadow: `0 0 30px ${theme.colors.glow.replace('drop-shadow-[0_0_10px_', '').replace(']', '')}` }}>
            <div className={`px-3 py-2 border-b ${theme.colors.ui.divider} ${theme.colors.text.accent} text-xs font-bold tracking-widest`}>
              SELECT THEME
            </div>
            <div className="p-2 space-y-1">
              {Object.entries(themes).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => {
                    setTheme(key as ThemeName);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 ${theme.typography.fontFamily} text-sm tracking-wider transition-all flex items-center justify-between rounded ${themeName === key
                    ? `${theme.colors.ui.active} ${theme.colors.text.primary} border-l-4 ${theme.colors.ui.border.replace('border-', 'border-')} font-bold`
                    : `${theme.colors.status.onTime} ${theme.colors.ui.hover}`
                    }`}
                >
                  <span>{t.label}</span>
                  {themeName === key && <span className={`${theme.colors.text.primary} text-lg`}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
