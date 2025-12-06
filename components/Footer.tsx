"use client";

import { useTheme } from "@/lib/ThemeContext";
import { ThemeName } from "@/lib/themes";
import { Github, Coffee, Heart } from "lucide-react";

function getFooterClasses(themeName: ThemeName) {
  switch (themeName) {
    case "swiss":
      return {
        bg: "bg-[#111827]",
        border: "border-[#E5E7EB]",
        text: "text-white",
        muted: "text-[#9CA3AF]",
        link: "text-[#FCA5A5] hover:text-white",
        button: "bg-[#E31837] hover:bg-[#C41230] hover:scale-105 text-white rounded-md transition-all duration-200",
        isSwiss: true,
        isSwissDark: false,
        isConfetti: false,
      };
    case "swiss-dark":
      return {
        bg: "bg-[#0F172A]",
        border: "border-[#374151]",
        text: "text-[#F9FAFB]",
        muted: "text-[#9CA3AF]",
        link: "text-[#F87171] hover:text-white",
        button: "bg-[#F87171] hover:bg-[#EF4444] hover:scale-105 text-white rounded-md transition-all duration-200",
        isSwiss: true,
        isSwissDark: true,
        isConfetti: false,
      };
    case "obsidian":
      return {
        bg: "bg-[#020203]",
        border: "border-white/[0.06]",
        text: "text-[#EDEDEF]",
        muted: "text-[#8A8F98]",
        link: "text-[#8A8F98] hover:text-[#EDEDEF]",
        button: "bg-[#5E6AD2] hover:bg-[#6872D9] text-white shadow-[0_0_0_1px_rgba(94,106,210,0.5),0_4px_12px_rgba(94,106,210,0.3)]",
        isSwiss: false,
        isConfetti: false,
      };
    case "napkin":
      return {
        bg: "bg-[#fdfbf7]",
        border: "border-[#2d2d2d]/30 border-dashed",
        text: "text-[#2d2d2d]",
        muted: "text-[#2d2d2d]/60",
        link: "text-[#ff4d4d] hover:text-[#2d5da1]",
        button: "bg-white border-[3px] border-[#2d2d2d] text-[#2d2d2d] shadow-[4px_4px_0px_0px_#2d2d2d] hover:shadow-[2px_2px_0px_0px_#2d2d2d] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] font-[var(--font-patrick-hand)]",
        isSwiss: false,
        isConfetti: false,
        isNapkin: true,
      };
    case "minimalist":
      return {
        bg: "bg-[#F2F2F2] minimalist-grid",
        border: "border-black border-t-4",
        text: "text-black",
        muted: "text-[#666666]",
        link: "text-black hover:text-[#FF3000] transition-colors duration-150",
        button: "bg-black text-white hover:bg-[#FF3000] transition-all duration-150 uppercase text-xs tracking-[0.15em] font-bold",
        isSwiss: false,
        isConfetti: false,
        isMinimalist: true,
      };
    case "confetti":
    default:
      return {
        bg: "bg-[#FFFDF5]",
        border: "border-[#E2E8F0]",
        text: "text-[#1E293B]",
        muted: "text-[#64748B]",
        link: "text-[#8B5CF6] hover:text-[#F472B6]",
        button: "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white border-2 border-[#1E293B] shadow-[4px_4px_0px_0px_#1E293B] hover:shadow-[6px_6px_0px_0px_#1E293B] hover:-translate-x-[2px] hover:-translate-y-[2px] active:shadow-[2px_2px_0px_0px_#1E293B] active:translate-x-[2px] active:translate-y-[2px]",
        isSwiss: false,
        isConfetti: true,
      };
  }
}

export default function Footer() {
  const { themeName } = useTheme();
  const classes = getFooterClasses(themeName);

  // Playful-specific footer styling
  if (classes.isConfetti) {
    return (
      <footer className="bg-[#FFFDF5] border-t-2 border-[#E2E8F0] py-6 px-4 mt-auto relative overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute top-4 left-8 w-6 h-6 rounded-full bg-[#F472B6] opacity-30" />
        <div className="absolute bottom-4 right-12 w-4 h-4 bg-[#FBBF24] rotate-45 opacity-40" />
        <div className="absolute top-1/2 right-4 w-3 h-3 rounded-full bg-[#34D399] opacity-30" />
        
        <div className="max-w-2xl mx-auto relative">
          {/* Playful geometric header */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-[#8B5CF6] border border-[#1E293B]" />
            <div className="w-3 h-3 bg-[#F472B6] rotate-45 border border-[#1E293B]" />
            <div className="w-3 h-3 rounded-full bg-[#FBBF24] border border-[#1E293B]" />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left: Made with love */}
            <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-medium">
              <span>Made with</span>
              <Heart className="w-3.5 h-3.5 text-[#F472B6] fill-[#F472B6]" />
              <span>for Caltrain riders</span>
            </div>

            {/* Center: Links */}
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/panhalsern/caltrain-live"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#8B5CF6] hover:text-[#F472B6] transition-colors font-medium"
              >
                <Github className="w-4 h-4" strokeWidth={2.5} />
                <span>GitHub</span>
              </a>
            </div>

            {/* Right: Buy Me a Coffee */}
            <a
              href="https://buymeacoffee.com/panhalsern"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#8B5CF6] text-white font-bold text-xs rounded-full border-2 border-[#1E293B] shadow-[3px_3px_0px_0px_#1E293B] hover:shadow-[4px_4px_0px_0px_#1E293B] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_#1E293B] active:translate-y-0.5 transition-all playful-bounce"
            >
              <Coffee className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>Buy me a coffee</span>
            </a>
          </div>

          {/* Legal Disclaimer */}
          <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
            <p className="text-[10px] text-[#64748B] text-center leading-relaxed">
              Data provided by{" "}
              <a
                href="https://www.caltrain.com/developer-resources"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8B5CF6] hover:text-[#F472B6] underline transition-colors"
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

  // Flat Design footer styling (light and dark)
  if (classes.isSwiss) {
    const accentColor = classes.isSwissDark ? "#F87171" : "#E31837";
    const successColor = classes.isSwissDark ? "#34D399" : "#22C55E";
    const warningColor = classes.isSwissDark ? "#FBBF24" : "#F59E0B";
    
    return (
      <footer className={`${classes.bg} py-8 px-4 mt-auto relative overflow-hidden`}>
        {/* Decorative geometric shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5 -translate-y-1/2 translate-x-1/2" style={{ backgroundColor: accentColor }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-5 translate-y-1/2 -translate-x-1/2" style={{ backgroundColor: successColor }} />
        
        <div className="max-w-7xl mx-auto relative">
          {/* Flat geometric header */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accentColor }} />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: successColor }} />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: warningColor }} />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left: Made with love */}
            <div className={`flex items-center gap-2 text-sm ${classes.muted}`}>
              <span>Made with</span>
              <Heart className="w-4 h-4 fill-current" style={{ color: accentColor }} />
              <span>for Caltrain riders</span>
            </div>

            {/* Center: Links */}
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/panhalsern/caltrain-live"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 text-sm ${classes.link} transition-colors`}
              >
                <Github className="w-5 h-5" strokeWidth={2} />
                <span>GitHub</span>
              </a>
            </div>

            {/* Right: Buy Me a Coffee */}
            <a
              href="https://buymeacoffee.com/panhalsern"
              target="_blank"
              rel="noopener noreferrer"
              className={classes.button + " flex items-center gap-2 px-5 py-2.5 font-medium text-sm"}
            >
              <Coffee className="w-4 h-4" strokeWidth={2} />
              <span>Buy me a coffee</span>
            </a>
          </div>

          {/* Legal Disclaimer */}
          <div className={`mt-6 pt-4 border-t ${classes.isSwissDark ? "border-[#374151]" : "border-white/10"}`}>
            <p className={`text-[11px] ${classes.isSwissDark ? "text-[#9CA3AF]" : "text-[#6B7280]"} text-center leading-relaxed`}>
              Data provided by{" "}
              <a
                href="https://www.caltrain.com/developer-resources"
                target="_blank"
                rel="noopener noreferrer"
                className={`${classes.link} transition-colors`}
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

  return (
    <footer className={`${classes.bg} border-t ${classes.border} py-4 px-4 mt-auto`}>
      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Made with love */}
        <div className={`flex items-center gap-1.5 text-xs ${classes.muted}`}>
          <span>Made with</span>
          <Heart className="w-3 h-3 text-red-500 fill-red-500" />
          <span>for Caltrain riders</span>
        </div>

        {/* Center: Links */}
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/panhalsern/caltrain-live"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 text-xs ${classes.link} transition-colors`}
          >
            <Github className="w-4 h-4" />
            <span>GitHub</span>
          </a>
        </div>

        {/* Right: Buy Me a Coffee */}
        <a
          href="https://buymeacoffee.com/panhalsern"
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${classes.button} transition-colors`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>Buy me a coffee</span>
        </a>
      </div>

      {/* Legal Disclaimer */}
      <div className={`max-w-2xl mx-auto mt-3 pt-3 border-t ${classes.border}`}>
        <p className={`text-[10px] ${classes.muted} text-center leading-relaxed`}>
          Data provided by{" "}
          <a
            href="https://www.caltrain.com/developer-resources"
            target="_blank"
            rel="noopener noreferrer"
            className={`${classes.link} underline`}
          >
            Caltrain GTFS API
          </a>
          . RailTime is an independent application and is not affiliated with, endorsed by, or sponsored by Caltrain or the Peninsula Corridor Joint Powers Board. All Caltrain trademarks and copyrighted materials are property of their respective owners. Data provided &quot;as is&quot; without warranties.
        </p>
      </div>
    </footer>
  );
}
