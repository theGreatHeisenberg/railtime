"use client";

import { DataSource } from "@/lib/types";
import { useTheme } from "@/lib/ThemeContext";
import { getBorderRadius } from "@/lib/themes";

interface LiveStatusBadgeProps {
  dataSource: DataSource;
  size?: "sm" | "md" | "lg";
}

/**
 * LiveStatusBadge - Displays data freshness status as a badge
 */
export default function LiveStatusBadge({ dataSource, size = "md" }: LiveStatusBadgeProps) {
  const { theme } = useTheme();
  const { raw, styles } = theme;
  const borderRadius = styles.isRounded ? (size === 'sm' ? '9999px' : '0.375rem') : '0';

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-[11px] px-2.5 py-1",
    lg: "text-xs px-3 py-1.5",
  };

  const getConfig = () => {
    switch (dataSource.type) {
      case "realtime":
        return { label: "LIVE", bg: raw.accent.success, text: '#FFFFFF', pulse: true };
      case "static":
        return { label: "SCHEDULED", bg: raw.bg.secondary, text: raw.text.muted, pulse: false };
      case "mixed":
        return { label: "PARTIAL", bg: raw.accent.primary, text: '#FFFFFF', pulse: false };
      case "cached":
        return { label: "CACHED", bg: raw.accent.warning, text: raw.text.primary, pulse: false };
      case "unavailable":
        return { label: "OFFLINE", bg: raw.accent.error, text: '#FFFFFF', pulse: false };
      default:
        return { label: "UNKNOWN", bg: raw.bg.secondary, text: raw.text.muted, pulse: false };
    }
  };

  const config = getConfig();

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium uppercase tracking-wide ${sizeClasses[size]}`}
      style={{
        backgroundColor: config.bg,
        color: config.text,
        borderRadius,
        border: `${styles.borderWidth} solid ${raw.border.primary}`,
      }}
      role="status"
      aria-label={`Data status: ${config.label}`}
    >
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span 
            className="animate-ping absolute inline-flex h-full w-full opacity-75"
            style={{ backgroundColor: '#FFFFFF', borderRadius: styles.isRounded ? '9999px' : '0' }}
          />
          <span 
            className="relative inline-flex h-2 w-2"
            style={{ backgroundColor: '#FFFFFF', borderRadius: styles.isRounded ? '9999px' : '0' }}
          />
        </span>
      )}
      {config.label}
    </span>
  );
}
