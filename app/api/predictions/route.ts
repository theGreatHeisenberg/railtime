
import { NextRequest, NextResponse } from 'next/server';
import scheduleData from '@/lib/schedule-data.json';
import tripStopsData from '@/lib/trip-stops-data.json';
import { CaltrainResponse, TrainPrediction } from '@/lib/types';
import { differenceInMinutes, format } from 'date-fns';
import { formatMinutesAsTime, getTimestampForMinutes } from '@/lib/staticScheduleGenerator';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const stationUrlName = searchParams.get('station');
    const stop1 = searchParams.get('stop1');
    const stop2 = searchParams.get('stop2');

    if (!stationUrlName || !stop1 || !stop2) {
        return NextResponse.json({ error: 'Missing station, stop1, or stop2 parameters' }, { status: 400 });
    }

    const url = `https://www.caltrain.com/gtfs/stops/${stationUrlName}/predictions`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Upstream API failed: ${response.status}`);
        }

        const json: CaltrainResponse = await response.json();
        const predictions: TrainPrediction[] = [];
        const schedule = scheduleData as Record<string, Record<string, number>>;
        const tripStops = tripStopsData as Record<string, string[]>;

        json.data.forEach((entry) => {
            entry.predictions.forEach((prediction) => {
                const trip = prediction.TripUpdate.Trip;
                const stopTimeUpdates = prediction.TripUpdate.StopTimeUpdate;

                // Get ALL stop IDs for this trip from GTFS static data
                // Fallback to real-time data if GTFS data is missing (shouldn't happen)
                const tripStopIds = tripStops[trip.TripId] || stopTimeUpdates.map(u => u.StopId);

                stopTimeUpdates.forEach((update) => {
                    const stopId = update.StopId;

                    // Check if this stopId belongs to our station
                    if (stopId !== stop1 && stopId !== stop2) {
                        return;
                    }

                    const trainNumber = trip.TripId;
                    const routeId = trip.RouteId;

                    const arrivalTimestamp = update.Arrival?.Time;
                    const departureTimestamp = update.Departure?.Time;
                    const timestamp = departureTimestamp || arrivalTimestamp;

                    if (!timestamp) return;

                    const date = new Date(timestamp * 1000);
                    const now = new Date();

                    // Filter out past trains (allow small buffer)
                    if (differenceInMinutes(date, now) < -5) return;

                    const etaMinutes = differenceInMinutes(date, now);
                    const etaDisplay = etaMinutes <= 0 ? "Now" : `${etaMinutes} min`;

                    // Determine direction
                    const isOdd = parseInt(stopId) % 2 !== 0;
                    const direction = isOdd ? "NB" : "SB";

                    // Determine Train Type
                    let trainType = "Local";
                    if (trainNumber.startsWith("1") || trainNumber.startsWith("2")) {
                        trainType = "Local";
                    } else if (["3", "4", "5", "6"].some(p => trainNumber.startsWith(p))) {
                        trainType = "Limited";
                    } else {
                        trainType = "Bullet";
                    }

                    // Look up scheduled time (in minutes since midnight)
                    const scheduledMinutes = schedule[trainNumber]?.[stopId];

                    // Format time in Pacific timezone
                    const options: Intl.DateTimeFormatOptions = {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'America/Los_Angeles'
                    };
                    const predictedTimeStr = date.toLocaleTimeString('en-US', options);

                    // Convert scheduled minutes to readable time string
                    const scheduledTime = scheduledMinutes !== undefined
                        ? formatMinutesAsTime(scheduledMinutes)
                        : predictedTimeStr;

                    // Calculate delay by comparing predicted vs scheduled time
                    let delayMinutes: number | undefined = undefined;
                    let delayStatus: "on-time" | "early" | "delayed" | undefined = undefined;

                    if (scheduledMinutes !== undefined) {
                        try {
                            // Convert scheduled minutes to a Date object
                            const scheduledDate = getTimestampForMinutes(scheduledMinutes);

                            // Calculate difference in minutes
                            delayMinutes = differenceInMinutes(date, scheduledDate);

                            // Determine status
                            if (delayMinutes <= -2) {
                                delayStatus = "early";
                            } else if (delayMinutes >= 2) {
                                delayStatus = "delayed";
                            } else {
                                delayStatus = "on-time";
                            }
                        } catch (e) {
                            // If parsing fails, ignore delay calculation
                        }
                    }

                    predictions.push({
                        TrainNumber: trainNumber,
                        TrainType: trainType,
                        ETA: etaDisplay,
                        Departure: predictedTimeStr, // This is the PREDICTED time
                        RouteID: routeId,
                        StopID: stopId,
                        Direction: direction,
                        timestamp: date.getTime(),
                        stopIds: tripStopIds, // This now contains ALL stops for the trip
                        ScheduledTime: scheduledTime, // This is the STATIC SCHEDULE time
                        delayMinutes,
                        delayStatus,
                    });
                });
            });
        });

        // Sort by time
        predictions.sort((a, b) => a.timestamp - b.timestamp);

        return NextResponse.json(predictions);

    } catch (error) {
        console.error('API Route Error:', error);
        return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 });
    }
}
