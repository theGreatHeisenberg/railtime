'use client';

import { useTheme } from '@/lib/ThemeContext';
import { themes, ThemeName } from '@/lib/themes';
import { useState } from 'react';

export default function TerminalThemeSwitcher() {
  const { themeName, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-green-400 hover:text-yellow-400 transition-colors font-mono text-xs tracking-widest hover:bg-green-950/30 px-2 py-1"
        title="Change theme"
      >
        [◆]
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-black border-2 border-cyan-400 shadow-lg z-50" style={{boxShadow: '0 0 30px rgba(6, 182, 212, 0.3)'}}>
          <div className="p-2 space-y-1">
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => {
                  setTheme(key as ThemeName);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2 py-1.5 font-mono text-xs tracking-wider transition-colors flex items-center justify-between ${
                  themeName === key
                    ? "bg-cyan-950/60 text-cyan-300 border-l-2 border-cyan-400"
                    : "text-green-400 hover:bg-green-950/30"
                }`}
              >
                <span>{theme.label}</span>
                {themeName === key && <span className="text-cyan-400">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
