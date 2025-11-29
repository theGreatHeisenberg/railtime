
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

    const schedule: Record<string, Record<string, string>> = {};
    const tripStops: Record<string, string[]> = {};

    (data as StopTime[]).forEach((row) => {
        const tripId = row.trip_id;
        const stopId = row.stop_id;

        // Build schedule mapping (trip_id -> stop_id -> formatted_time)
        if (!schedule[tripId]) {
            schedule[tripId] = {};
        }
        // Convert HH:MM:SS to h:mm a (e.g., 14:30:00 -> 2:30 PM)
        // Note: GTFS times can be > 24:00:00 for late night trains
        schedule[tripId][stopId] = formatGtfsTime(row.departure_time);

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

function formatGtfsTime(timeStr: string): string {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);

    // Handle > 24h times (e.g. 25:00 is 1:00 AM next day)
    const normalizedH = h % 24;

    const ampm = normalizedH >= 12 ? 'PM' : 'AM';
    const displayH = normalizedH % 12 || 12; // 0 -> 12
    const displayM = m.toString().padStart(2, '0');

    return `${displayH}:${displayM} ${ampm}`;
}

buildSchedule();
