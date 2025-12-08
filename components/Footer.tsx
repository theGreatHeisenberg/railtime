"use client";

import { useTheme } from "@/lib/ThemeContext";
import { Github, Heart } from "lucide-react";

export default function Footer() {
  const { theme } = useTheme();
  const { raw, classes, styles } = theme;

  return (
    <footer 
      className={`py-6 px-4 mt-auto border-t ${classes.border}`}
      style={{ backgroundColor: styles.isDark ? raw.bg.secondary : raw.bg.primary }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Decorative dots */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: raw.accent.primary }} />
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: raw.accent.success }} />
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: raw.accent.warning }} />
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Made with love */}
          <div className={`flex items-center gap-1.5 text-xs ${classes.textMuted}`}>
            <span>Made with</span>
            <Heart className="w-3.5 h-3.5 fill-current" style={{ color: raw.accent.primary }} />
            <span>for Caltrain riders</span>
          </div>

          {/* GitHub link */}
          <a
            href="https://github.com/theGreatHeisenberg/railtime"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-all ${classes.buttonPrimary}`}
            style={{ borderRadius: styles.borderRadius }}
          >
            <Github className="w-4 h-4" strokeWidth={2} />
            <span>GitHub</span>
          </a>
        </div>

        {/* Legal Disclaimer */}
        <div className={`mt-4 pt-3 border-t ${classes.divider}`}>
          <p className={`text-[10px] ${classes.textMuted} text-center leading-relaxed`}>
            Data provided by{" "}
            <a
              href="https://www.caltrain.com/developer-resources"
              target="_blank"
              rel="noopener noreferrer"
              className={`${classes.textAccent} hover:underline transition-colors`}
            >
              Caltrain GTFS API
            </a>
            . RailTime is an independent application and is not affiliated with, endorsed by, or sponsored by Caltrain or the Peninsula Corridor Joint Powers Board.
          </p>
        </div>
      </div>
    </footer>
  );
}
