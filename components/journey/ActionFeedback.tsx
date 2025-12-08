"use client";

import { Check } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

interface ActionFeedbackProps {
  message: string | null;
  visible: boolean;
}

/**
 * ActionFeedback - Toast notification for user actions
 * Uses the unified theme system from ThemeContext
 */
export default function ActionFeedback({ message, visible }: ActionFeedbackProps) {
  const { theme } = useTheme();
  
  return (
    <div 
      className="fixed top-20 left-1/2 z-50 transition-all duration-300 pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? '0' : '-10px'})`,
      }}
    >
      <div 
        className={`flex items-center gap-2 px-4 py-2 ${theme.classes.card} ${theme.classes.shadow}`}
      >
        <Check className="w-4 h-4" style={{ color: theme.raw.accent.success }} />
        <span className={`text-sm font-medium ${theme.classes.textPrimary}`}>
          {message}
        </span>
      </div>
    </div>
  );
}
