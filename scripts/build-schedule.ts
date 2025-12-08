
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const gtfsDir = path.join(process.cwd(), 'gtfs_data');
const stopTimesPath = path.join(gtfsDir, 'stop_times.txt');
const scheduleOutputPath = path.join(process.cwd(), 'lib', 'schedule-data.json');
const tripStopsOutputPath = path.join(process.cwd(), 'lib', 'trip-stops-data.json');

interface StopTime {
    trip_id: string;
    stop_id: string;
    stop_sequence: string;
    departure_time: string;
    arrival_time: string;
}

const buildSchedule = async () => {
    const csvFile = fs.readFileSync(stopTimesPath, 'utf8');

    const { data } = Papa.parse(csvFile, {
        header: true,
        skipEmptyLines: true,
    });

    const schedule: Record<string, Record<string, number>> = {};
    const tripStops: Record<string, string[]> = {};

    (data as StopTime[]).forEach((row) => {
        const tripId = row.trip_id;
        const stopId = row.stop_id;

        // Build schedule mapping (trip_id -> stop_id -> minutes_since_midnight)
        if (!schedule[tripId]) {
            schedule[tripId] = {};
        }
        // Convert HH:MM:SS to minutes since midnight (e.g., 14:30:00 -> 870)
        // Note: GTFS times can be > 24:00:00 for late night trains (e.g., 25:00 -> 1500)
        schedule[tripId][stopId] = gtfsTimeToMinutes(row.departure_time);

        // Build trip stops mapping (trip_id -> array of stop_ids in sequence)
        if (!tripStops[tripId]) {
            tripStops[tripId] = [];
        }
        tripStops[tripId].push(stopId);
    });

    // Write schedule data
    fs.writeFileSync(scheduleOutputPath, JSON.stringify(schedule, null, 0)); // Minified
    console.log(`✅ Built schedule-data.json with ${Object.keys(schedule).length} trips`);

    // Write trip-stops mapping
    fs.writeFileSync(tripStopsOutputPath, JSON.stringify(tripStops, null, 0)); // Minified
    console.log(`✅ Built trip-stops-data.json with ${Object.keys(tripStops).length} trips`);

};

/**
 * Convert GTFS time string to minutes since midnight
 * Examples:
 *   "06:00:00" -> 360 (6 * 60)
 *   "14:30:00" -> 870 (14 * 60 + 30)
 *   "25:00:00" -> 1500 (25 * 60) - late night trains next day
 */
function gtfsTimeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

buildSchedule();
