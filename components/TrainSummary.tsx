"use client";

import { useTheme } from "@/lib/ThemeContext";
import { TrainPrediction, Station } from "@/lib/types";

interface TrainSummaryProps {
  train: TrainPrediction;
  origin: string;
  destination?: string;
  etaToOriginMinutes: number;
  etaToDestinationMinutes: number;
  trainReachedOrigin: boolean;
  stations: Station[];
  currentTime: Date;
}

export default function TrainSummary({
  train,
  origin,
  destination,
  etaToOriginMinutes,
  etaToDestinationMinutes,
  trainReachedOrigin,
  stations,
  currentTime,
}: TrainSummaryProps) {
  const { theme } = useTheme();

  const getArrivalTime = (etaMinutes: number): string => {
    const arrivalDate = new Date(currentTime.getTime() + etaMinutes * 60000);
    return arrivalDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const delayColor =
    train.delayStatus === "delayed"
      ? "text-red-400"
      : train.delayStatus === "early"
        ? "text-blue-400"
        : "text-green-400";

  const delayLabel =
    train.delayStatus === "delayed"
      ? `${train.delayMinutes}m LATE`
      : train.delayStatus === "early"
        ? `${Math.abs(train.delayMinutes!)}m EARLY`
        : "ON TIME";

  const showDestination = destination && etaToDestinationMinutes > 0;

  return (
    <div className={`${theme.colors.bg.card} ${theme.colors.text.primary} rounded-lg p-4 border ${theme.colors.ui.border} transition-colors duration-500`}>
      <div className="space-y-3">
        {/* ETAs Section */}
        <div className={`grid gap-4 ${showDestination ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
          {!trainReachedOrigin && (
            <div className={`${showDestination ? `border-b md:border-b-0 md:border-r ${theme.colors.ui.divider} pb-4 md:pb-0 md:pr-4` : ""}`}>
              <div className={`text-xs ${theme.colors.text.accent} mb-2`}>ETA to Origin</div>
              <div className={`text-lg font-bold ${delayColor}`}>
                {etaToOriginMinutes}m
              </div>
              <div className={`text-xs ${theme.colors.text.muted} mt-1`}>
                Arrive @ {getArrivalTime(etaToOriginMinutes)}
              </div>
              <div className={`text-xs ${theme.colors.text.accent} mt-0.5`}>{origin}</div>
            </div>
          )}

          {showDestination && (
            <div className={trainReachedOrigin ? "" : "md:pl-4"}>
              <div className={`text-xs ${theme.colors.text.accent} mb-2`}>ETA to Destination</div>
              <div className={`text-lg font-bold ${delayColor}`}>
                {etaToDestinationMinutes}m
              </div>
              <div className={`text-xs ${theme.colors.text.muted} mt-1`}>
                Arrive @ {getArrivalTime(etaToDestinationMinutes)}
              </div>
              <div className={`text-xs ${theme.colors.text.accent} mt-0.5`}>{destination}</div>
            </div>
          )}
        </div>

        {/* Status and Train Info Section */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 border-t ${theme.colors.ui.divider} pt-3`}>
          <div>
            <div className={`text-xs ${theme.colors.text.accent} mb-1`}>Status</div>
            <div className={`text-sm font-bold ${delayColor}`}>{delayLabel}</div>
          </div>
          <div>
            <div className={`text-xs ${theme.colors.text.accent} mb-1`}>Train Info</div>
            <div className={`text-sm font-bold ${theme.colors.text.secondary}`}>
              Train #{train.TrainNumber} {train.Direction === "SB" ? "↓ South" : "↑ North"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
