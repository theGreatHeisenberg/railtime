"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { ServiceAlert } from "@/lib/types";
import { Megaphone, AlertTriangle, Info, AlertCircle, X } from "lucide-react";



interface ServiceAlertsBannerProps {
  /** Auto-refresh interval in milliseconds (default: 60000 = 1 minute) */
  refreshInterval?: number;
}

/**
 * ServiceAlertsBanner - Compact alert button with badge that opens a modal
 * 
 * Features:
 * - Small bell icon with alert count badge
 * - Click to open modal with all alerts
 * - Color-coded by severity (info, warning, severe)
 * - Auto-refreshes every minute
 */
export default function ServiceAlertsBanner({
  refreshInterval = 60000,
}: ServiceAlertsBannerProps) {
  const { theme, themeName } = useTheme();
  const isSwiss = themeName === "swiss" || themeName === "swiss-dark";
  const isSwissDark = themeName === "swiss-dark";
  const isObsidian = themeName === "obsidian";
  const isNapkin = themeName === "napkin";
  const isConfetti = themeName === "confetti";
  const isMinimalist = themeName === "minimalist";
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Fetch service alerts from the API
   */
  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch('/api/system/status');
      if (!response.ok) return;
      
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error('Failed to fetch service alerts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch alerts on mount
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(fetchAlerts, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchAlerts, refreshInterval]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  /**
   * Get icon and colors for severity
   */
  const getSeverityConfig = (severity: ServiceAlert['severity']) => {
    switch (severity) {
      case 'severe':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-500/50',
          textColor: 'text-red-200',
          iconColor: 'text-red-400',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/50',
          textColor: 'text-yellow-200',
          iconColor: 'text-yellow-400',
        };
      default:
        return {
          icon: <Info className="w-4 h-4" />,
          bgColor: 'bg-blue-500/20',
          borderColor: 'border-blue-500/50',
          textColor: 'text-blue-200',
          iconColor: 'text-blue-400',
        };
    }
  };

  // Get badge color based on highest severity
  const getBadgeColor = () => {
    if (isSwiss) {
      if (isSwissDark) {
        if (alerts.some(a => a.severity === 'severe')) return 'bg-[#F87171]';
        if (alerts.some(a => a.severity === 'warning')) return 'bg-[#FBBF24] text-[#111827]';
        return 'bg-[#60A5FA]';
      }
      if (alerts.some(a => a.severity === 'severe')) return 'bg-[#EF4444]';
      if (alerts.some(a => a.severity === 'warning')) return 'bg-[#F59E0B] text-[#111827]';
      return 'bg-[#3B82F6]';
    }
    if (isObsidian) {
      if (alerts.some(a => a.severity === 'severe')) return 'bg-rose-500';
      if (alerts.some(a => a.severity === 'warning')) return 'bg-amber-500';
      return 'bg-[#5E6AD2]';
    }
    if (isNapkin) {
      if (alerts.some(a => a.severity === 'severe')) return 'bg-[#ff4d4d]';
      if (alerts.some(a => a.severity === 'warning')) return 'bg-[#fff9c4]';
      return 'bg-[#2d5da1]';
    }
    if (isMinimalist) {
      // Swiss International: Black with Swiss Red for severe
      if (alerts.some(a => a.severity === 'severe')) return 'bg-[#FF3000] text-white';
      if (alerts.some(a => a.severity === 'warning')) return 'bg-black text-white';
      return 'bg-[#F2F2F2] text-black';
    }
    // Default: confetti
    if (alerts.some(a => a.severity === 'severe')) return 'bg-[#F472B6]';
    if (alerts.some(a => a.severity === 'warning')) return 'bg-[#FBBF24]';
    return 'bg-[#8B5CF6]';
  };

  // Don't render if loading or no alerts
  if (loading || alerts.length === 0) {
    return null;
  }

  // Flat Design button (light and dark)
  if (isSwiss) {
    const flatBtnBg = isSwissDark ? "bg-[#374151]" : "bg-[#F3F4F6]";
    const flatBtnHover = isSwissDark ? "hover:bg-[#4B5563]" : "hover:bg-[#E5E7EB]";
    const flatIconColor = isSwissDark ? "text-[#F9FAFB]" : "text-[#111827]";
    
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={`relative p-2.5 ${flatBtnBg} rounded-lg ${flatBtnHover} hover:scale-105 active:scale-100 transition-all duration-200`}
          aria-label={`${alerts.length} service alert${alerts.length !== 1 ? 's' : ''}`}
          title={`${alerts.length} service alert${alerts.length !== 1 ? 's' : ''}`}
        >
          <Megaphone className={`w-5 h-5 ${flatIconColor}`} strokeWidth={2} />
          <span className={`absolute -top-1 -right-1 ${getBadgeColor()} text-white text-[10px] font-medium min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full`}>
            {alerts.length}
          </span>
        </button>
        {renderModal()}
      </>
    );
  }

  // Linear-styled button
  if (isObsidian) {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="relative p-2 rounded-lg bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.06] hover:bg-white/[0.10] hover:border-white/[0.10] transition-all backdrop-blur-sm"
          aria-label={`${alerts.length} service alert${alerts.length !== 1 ? 's' : ''}`}
          title={`${alerts.length} service alert${alerts.length !== 1 ? 's' : ''}`}
        >
          <Megaphone className="w-5 h-5 text-[#8A8F98]" />
          <span className={`absolute -top-1 -right-1 ${getBadgeColor()} text-white text-[10px] font-medium rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1`}>
            {alerts.length}
          </span>
        </button>
        {renderModal()}
      </>
    );
  }

  // Sketch-styled button
  if (isNapkin) {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="relative p-2 bg-white border-[3px] border-[#2d2d2d] shadow-[4px_4px_0px_0px_#2d2d2d] hover:shadow-[2px_2px_0px_0px_#2d2d2d] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all duration-100 font-[var(--font-patrick-hand)]"
          style={{ borderRadius: "40px 8px 45px 6px / 8px 42px 7px 40px" }}
          aria-label={`${alerts.length} service alert${alerts.length !== 1 ? 's' : ''}`}
          title={`${alerts.length} service alert${alerts.length !== 1 ? 's' : ''}`}
        >
          <Megaphone className="w-5 h-5 text-[#ff4d4d]" strokeWidth={2.5} />
          <span 
            className={`absolute -top-2 -right-2 ${getBadgeColor()} ${alerts.some(a => a.severity === 'warning') ? 'text-[#2d2d2d]' : 'text-white'} text-[10px] font-bold min-w-[20px] h-[20px] flex items-center justify-center px-1 border-2 border-[#2d2d2d] shadow-[2px_2px_0px_0px_#2d2d2d]`}
            style={{ borderRadius: "20px 4px 22px 3px / 4px 20px 3px 22px" }}
          >
            {alerts.length}
          </span>
        </button>
        {renderModal()}
      </>
    );
  }

  // Minimalist-styled button - Swiss International style
  if (isMinimalist) {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="relative p-2 bg-white border-2 border-black hover:bg-[#FF3000] hover:border-[#FF3000] hover:text-white transition-all duration-150 group"
          style={{ borderRadius: 0 }}
          aria-label={`${alerts.length} service alert${alerts.length !== 1 ? 's' : ''}`}
          title={`${alerts.length} service alert${alerts.length !== 1 ? 's' : ''}`}
        >
          <Megaphone className="w-5 h-5 text-black group-hover:text-white transition-colors duration-150" strokeWidth={2} />
          <span 
            className={`absolute -top-1 -right-1 ${getBadgeColor()} text-[9px] font-bold tracking-wider min-w-[18px] h-[18px] flex items-center justify-center px-1 border-2 border-black`}
            style={{ borderRadius: 0 }}
          >
            {alerts.length}
          </span>
        </button>
        {renderModal()}
      </>
    );
  }

  // Confetti-styled button
  if (isConfetti) {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="relative p-2 bg-white border-2 border-[#1E293B] rounded-xl shadow-[4px_4px_0px_0px_#1E293B] hover:shadow-[6px_6px_0px_0px_#1E293B] hover:-translate-x-[2px] hover:-translate-y-[2px] active:shadow-[2px_2px_0px_0px_#1E293B] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-300"
          aria-label={`${alerts.length} service alert${alerts.length !== 1 ? 's' : ''}`}
          title={`${alerts.length} service alert${alerts.length !== 1 ? 's' : ''}`}
        >
          <Megaphone className="w-5 h-5 text-[#8B5CF6]" strokeWidth={2.5} />
          <span className={`absolute -top-2 -right-2 ${getBadgeColor()} text-white text-[10px] font-bold min-w-[20px] h-[20px] flex items-center justify-center px-1 rounded-full border-2 border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B]`}>
            {alerts.length}
          </span>
        </button>
        {renderModal()}
      </>
    );
  }

  return (
    <>
      {/* Alert Button with Badge */}
      <button
        onClick={() => setIsOpen(true)}
        className={`relative p-2 rounded-lg border ${theme.colors.ui.border} ${theme.colors.bg.card} hover:${theme.colors.ui.hover} transition-colors`}
        aria-label={`${alerts.length} service alert${alerts.length !== 1 ? 's' : ''}`}
        title={`${alerts.length} service alert${alerts.length !== 1 ? 's' : ''}`}
      >
        <Megaphone className={`w-5 h-5 ${theme.colors.text.secondary}`} />
        {/* Badge */}
        <span className={`absolute -top-1 -right-1 ${getBadgeColor()} text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1`}>
          {alerts.length}
        </span>
      </button>
      {renderModal()}
    </>
  );

  function renderModal() {
    if (!isOpen) return null;
    
    return (

      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={() => setIsOpen(false)}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        
        {/* Modal Content */}
        <div 
          className={`relative w-full max-w-lg max-h-[80vh] overflow-hidden ${
            isSwiss 
              ? isSwissDark 
                ? "bg-[#1F2937] rounded-lg border border-[#374151]"
                : "bg-white rounded-lg" 
              : isObsidian
              ? "rounded-xl bg-[#0a0a0c] border border-white/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_40px_rgba(0,0,0,0.5),0_0_80px_rgba(0,0,0,0.3)]"
              : isNapkin
              ? "bg-white border-[3px] border-[#2d2d2d] shadow-[8px_8px_0px_0px_#2d2d2d] font-[var(--font-patrick-hand)]"
              : isConfetti
              ? "bg-white border-2 border-[#1E293B] rounded-2xl shadow-[8px_8px_0px_0px_#E2E8F0]"
              : isMinimalist
              ? "bg-white border-4 border-black"
              : `rounded-lg border ${theme.colors.ui.border} ${theme.colors.bg.primary} shadow-2xl`
          }`}
          style={isMinimalist ? { borderRadius: 0 } : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 ${
            isSwiss 
              ? isSwissDark
                ? "border-b border-[#374151] bg-[#111827]"
                : "border-b border-[#E5E7EB] bg-[#F3F4F6]" 
              : isObsidian
              ? "border-b border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent"
              : isNapkin
              ? "border-b-[3px] border-dashed border-[#2d2d2d]/30 bg-[#fdfbf7]"
              : isConfetti
              ? "border-b-2 border-[#E2E8F0] bg-white"
              : isMinimalist
              ? "border-b-4 border-black bg-[#F2F2F2]"
              : `border-b ${theme.colors.ui.divider}`
          }`}>
            <div className="flex items-center gap-2">
              <Megaphone className={`w-5 h-5 ${isSwiss ? (isSwissDark ? "text-[#60A5FA]" : "text-[#3B82F6]") : isObsidian ? "text-[#5E6AD2]" : isNapkin ? "text-[#ff4d4d]" : isMinimalist ? "text-[#FF3000]" : isConfetti ? "text-[#8B5CF6]" : theme.colors.text.accent}`} strokeWidth={isSwiss ? 2 : isConfetti ? 2.5 : isNapkin ? 2.5 : isMinimalist ? 2 : 2} />
              <h2 className={`font-bold ${isSwiss ? (isSwissDark ? "text-[#F9FAFB] font-semibold" : "text-[#111827] font-semibold") : isObsidian ? "text-[#EDEDEF] font-medium" : isNapkin ? "text-[#2d2d2d] font-bold font-[var(--font-kalam)]" : isMinimalist ? "text-black font-bold uppercase tracking-widest" : isConfetti ? "text-[#1E293B] font-bold" : theme.colors.text.primary}`}>
                Service Alerts ({alerts.length})
              </h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className={`p-1 ${isSwiss ? (isSwissDark ? "rounded-md text-[#9CA3AF] hover:bg-[#374151] hover:text-[#F9FAFB] transition-all" : "rounded-md text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#111827] transition-all") : isObsidian ? "rounded-md hover:bg-white/[0.08] text-[#8A8F98]" : isNapkin ? "border-2 border-[#2d2d2d] text-[#2d2d2d] hover:bg-[#e5e0d8] shadow-[2px_2px_0px_0px_#2d2d2d] hover:shadow-[1px_1px_0px_0px_#2d2d2d] transition-all duration-100" : isMinimalist ? "border-2 border-black text-black hover:bg-[#FF3000] hover:border-[#FF3000] hover:text-white transition-all duration-150" : isConfetti ? "rounded-lg border-2 border-[#1E293B] text-[#1E293B] hover:bg-[#FBBF24] shadow-[2px_2px_0px_0px_#1E293B] hover:shadow-[3px_3px_0px_0px_#1E293B] transition-all" : `rounded hover:${theme.colors.ui.hover} ${theme.colors.text.muted}`}`}
              style={isMinimalist ? { borderRadius: 0 } : undefined}
              aria-label="Close"
            >
              <X className="w-5 h-5" strokeWidth={isSwiss ? 2 : isConfetti ? 2.5 : isMinimalist ? 2 : 2} />
            </button>
          </div>

          {/* Alert List */}
          <div className={`overflow-y-auto max-h-[60vh] p-4 space-y-3 ${isSwiss ? (isSwissDark ? "bg-[#1F2937]" : "bg-white") : isObsidian ? "bg-[#050506]" : isNapkin ? "bg-[#fdfbf7]" : isMinimalist ? "bg-white" : isConfetti ? "bg-[#FFFDF5]" : ""}`}>
            {alerts.map((alert) => {
              const config = getSeverityConfig(alert.severity);
              
              if (isSwiss) {
                const flatConfig = isSwissDark 
                  ? {
                      severe: { bg: 'bg-[#F87171]', text: 'text-white', icon: 'text-white' },
                      warning: { bg: 'bg-[#FBBF24]', text: 'text-[#111827]', icon: 'text-[#111827]' },
                      info: { bg: 'bg-[#60A5FA]', text: 'text-white', icon: 'text-white' },
                    }[alert.severity] || { bg: 'bg-[#60A5FA]', text: 'text-white', icon: 'text-white' }
                  : {
                      severe: { bg: 'bg-[#EF4444]', text: 'text-white', icon: 'text-white' },
                      warning: { bg: 'bg-[#F59E0B]', text: 'text-[#111827]', icon: 'text-[#111827]' },
                      info: { bg: 'bg-[#3B82F6]', text: 'text-white', icon: 'text-white' },
                    }[alert.severity] || { bg: 'bg-[#3B82F6]', text: 'text-white', icon: 'text-white' };
                
                return (
                  <div
                    key={alert.id}
                    className={`${flatConfig.bg} rounded-lg p-4 hover:scale-[1.01] transition-all duration-200`}
                    role="alert"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <span className={flatConfig.icon}>{config.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        {alert.title && alert.title !== alert.description && (
                          <div className={`font-semibold text-sm ${flatConfig.text}`}>
                            {alert.title}
                          </div>
                        )}
                        <div className={`text-xs mt-1 ${flatConfig.text} opacity-90`}>
                          {alert.description}
                        </div>
                        {alert.affectedStations && alert.affectedStations.length > 0 && (
                          <div className={`text-[10px] mt-2 ${flatConfig.text} opacity-70`}>
                            Affected: {alert.affectedStations.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
              
              if (isObsidian) {
                const linearConfig = {
                  severe: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', icon: 'text-rose-400' },
                  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: 'text-amber-400' },
                  info: { bg: 'bg-[#5E6AD2]/10', border: 'border-[#5E6AD2]/20', text: 'text-[#5E6AD2]', icon: 'text-[#5E6AD2]' },
                }[alert.severity] || { bg: 'bg-[#5E6AD2]/10', border: 'border-[#5E6AD2]/20', text: 'text-[#5E6AD2]', icon: 'text-[#5E6AD2]' };
                
                return (
                  <div
                    key={alert.id}
                    className={`${linearConfig.bg} ${linearConfig.border} border rounded-lg p-3 backdrop-blur-sm`}
                    role="alert"
                  >
                    <div className="flex items-start gap-3">
                      <span className={`${linearConfig.icon} mt-0.5`}>{config.icon}</span>
                      <div className="flex-1 min-w-0">
                        {alert.title && alert.title !== alert.description && (
                          <div className={`font-medium text-sm text-[#EDEDEF]`}>
                            {alert.title}
                          </div>
                        )}
                        <div className="text-xs text-[#8A8F98] mt-0.5">
                          {alert.description}
                        </div>
                        {alert.affectedStations && alert.affectedStations.length > 0 && (
                          <div className="text-[10px] text-[#8A8F98]/70 mt-1">
                            Affected: {alert.affectedStations.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
              
              if (isNapkin) {
                const sketchConfig = {
                  severe: { bg: 'bg-[#ff4d4d]', border: 'border-[#2d2d2d]', text: 'text-white', icon: 'text-white' },
                  warning: { bg: 'bg-[#fff9c4]', border: 'border-[#2d2d2d]', text: 'text-[#2d2d2d]', icon: 'text-[#2d2d2d]' },
                  info: { bg: 'bg-[#2d5da1]', border: 'border-[#2d2d2d]', text: 'text-white', icon: 'text-white' },
                }[alert.severity] || { bg: 'bg-[#2d5da1]', border: 'border-[#2d2d2d]', text: 'text-white', icon: 'text-white' };
                
                return (
                  <div
                    key={alert.id}
                    className={`${sketchConfig.bg} ${sketchConfig.border} border-[3px] p-3 shadow-[4px_4px_0px_0px_#2d2d2d] hover:shadow-[2px_2px_0px_0px_#2d2d2d] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-100`}
                    style={{ borderRadius: "40px 8px 45px 6px / 8px 42px 7px 40px" }}
                    role="alert"
                  >
                    <div className="flex items-start gap-3">
                      <span className={`${sketchConfig.icon} mt-0.5`}>{config.icon}</span>
                      <div className="flex-1 min-w-0">
                        {alert.title && alert.title !== alert.description && (
                          <div className={`font-bold text-sm ${sketchConfig.text} font-[var(--font-kalam)]`}>
                            {alert.title}
                          </div>
                        )}
                        <div className={`text-xs ${sketchConfig.text} opacity-90 mt-0.5`}>
                          {alert.description}
                        </div>
                        {alert.affectedStations && alert.affectedStations.length > 0 && (
                          <div className={`text-[10px] ${sketchConfig.text} opacity-70 mt-1`}>
                            Affected: {alert.affectedStations.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Minimalist Swiss International theme alerts
              if (isMinimalist) {
                const minimalistConfig = {
                  severe: { bg: 'bg-[#FF3000]', border: 'border-black', text: 'text-white', icon: 'text-white' },
                  warning: { bg: 'bg-[#F2F2F2]', border: 'border-black', text: 'text-black', icon: 'text-black' },
                  info: { bg: 'bg-black', border: 'border-black', text: 'text-white', icon: 'text-white' },
                }[alert.severity] || { bg: 'bg-black', border: 'border-black', text: 'text-white', icon: 'text-white' };
                
                return (
                  <div
                    key={alert.id}
                    className={`${minimalistConfig.bg} ${minimalistConfig.border} border-2 p-4 hover:scale-[1.01] transition-all duration-150`}
                    style={{ borderRadius: 0 }}
                    role="alert"
                  >
                    <div className="flex items-start gap-3">
                      <span className={`${minimalistConfig.icon} mt-0.5`}>{config.icon}</span>
                      <div className="flex-1 min-w-0">
                        {alert.title && alert.title !== alert.description && (
                          <div className={`font-bold text-sm ${minimalistConfig.text} uppercase tracking-widest`}>
                            {alert.title}
                          </div>
                        )}
                        <div className={`text-xs ${minimalistConfig.text} opacity-90 mt-1`}>
                          {alert.description}
                        </div>
                        {alert.affectedStations && alert.affectedStations.length > 0 && (
                          <div className={`text-[10px] ${minimalistConfig.text} opacity-70 mt-2 uppercase tracking-wider`}>
                            Affected: {alert.affectedStations.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Playful theme alerts
              if (isConfetti) {
                const playfulConfig = {
                  severe: { bg: 'bg-[#F472B6]', border: 'border-[#1E293B]', text: 'text-white', icon: 'text-white' },
                  warning: { bg: 'bg-[#FBBF24]', border: 'border-[#1E293B]', text: 'text-[#1E293B]', icon: 'text-[#1E293B]' },
                  info: { bg: 'bg-[#8B5CF6]', border: 'border-[#1E293B]', text: 'text-white', icon: 'text-white' },
                }[alert.severity] || { bg: 'bg-[#8B5CF6]', border: 'border-[#1E293B]', text: 'text-white', icon: 'text-white' };
                
                return (
                  <div
                    key={alert.id}
                    className={`${playfulConfig.bg} ${playfulConfig.border} border-2 rounded-xl p-4 shadow-[4px_4px_0px_0px_#1E293B] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#1E293B]`}
                    role="alert"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <span className={playfulConfig.icon}>{config.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        {alert.title && alert.title !== alert.description && (
                          <div className={`font-bold text-sm ${playfulConfig.text}`}>
                            {alert.title}
                          </div>
                        )}
                        <div className={`text-xs mt-1 ${playfulConfig.text} opacity-90`}>
                          {alert.description}
                        </div>
                        {alert.affectedStations && alert.affectedStations.length > 0 && (
                          <div className={`text-[10px] mt-2 ${playfulConfig.text} opacity-70 font-medium`}>
                            Affected: {alert.affectedStations.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
              
              return (
                <div
                  key={alert.id}
                  className={`${config.bgColor} ${config.borderColor} border rounded-lg p-3`}
                  role="alert"
                >
                  <div className="flex items-start gap-3">
                    <span className={`${config.iconColor} mt-0.5`}>{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      {alert.title && alert.title !== alert.description && (
                        <div className={`font-medium text-sm ${config.textColor}`}>
                          {alert.title}
                        </div>
                      )}
                      <div className={`text-xs ${theme.colors.text.muted} mt-0.5`}>
                        {alert.description}
                      </div>
                      {alert.affectedStations && alert.affectedStations.length > 0 && (
                        <div className={`text-[10px] ${theme.colors.text.muted} mt-1 opacity-70`}>
                          Affected: {alert.affectedStations.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className={`p-3 text-center ${
            isSwiss 
              ? isSwissDark
                ? "border-t border-[#374151] bg-[#111827]"
                : "border-t border-[#E5E7EB] bg-[#F3F4F6]" 
              : isObsidian
              ? "border-t border-white/[0.06] bg-gradient-to-b from-transparent to-white/[0.02]"
              : isNapkin
              ? "border-t-[3px] border-dashed border-[#2d2d2d]/30 bg-[#fdfbf7]"
              : isConfetti
              ? "border-t-2 border-[#E2E8F0] bg-white"
              : isMinimalist
              ? "border-t-2 border-black bg-[#F2F2F2]"
              : `border-t ${theme.colors.ui.divider}`
          }`}>
            <span className={`text-xs ${isSwiss ? (isSwissDark ? "text-[#9CA3AF]" : "text-[#6B7280]") : isObsidian ? "text-[#8A8F98]" : isNapkin ? "text-[#2d2d2d]/60 font-[var(--font-patrick-hand)]" : isMinimalist ? "text-[#666666] uppercase tracking-widest font-bold" : isConfetti ? "font-medium text-[#64748B]" : theme.colors.text.muted}`}>
              Auto-refreshes every minute
            </span>
          </div>
        </div>
      </div>
    );
  }
}
