
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const gtfsDir = path.join(process.cwd(), 'gtfs_data');
const stopsPath = path.join(gtfsDir, 'stops.txt');
const outputPath = path.join(process.cwd(), 'lib', 'stations.json');

interface GtfsStop {
    stop_id: string;
    stop_name: string;
    stop_lat: string;
    stop_lon: string;
    parent_station: string;
    location_type: string; // 0=Stop/Platform, 1=Station
}

interface Station {
    stop1: string; // Northbound ID (Odd)
    stop2: string; // Southbound ID (Even)
    stopname: string;
    urlname: string;
    lat: number;
    lon: number;
}

const buildStations = async () => {
    const csvFile = fs.readFileSync(stopsPath, 'utf8');

    const { data } = Papa.parse(csvFile, {
        header: true,
        skipEmptyLines: true,
    });

    const stops = data as GtfsStop[];
    const stationsMap: Record<string, Partial<Station>> = {};

    // Helper to normalize station names
    const cleanName = (name: string) => {
        return name
            .replace(' Caltrain', '')
            .replace(' Northbound', '')
            .replace(' Southbound', '')
            .replace(' Station', '')
            .trim();
    };

    stops.forEach((stop) => {
        // We only care about platforms (location_type 0) that have numeric IDs (standard Caltrain stops)
        // Ignoring "22nd_street" parent station entry, looking for 70021/70022
        if (stop.location_type === '1') return; // Skip parent stations
        if (!/^\d+$/.test(stop.stop_id)) return; // Skip non-numeric IDs if any (like "22nd_street" if it appears as a stop)

        const stopId = parseInt(stop.stop_id);
        const isOdd = stopId % 2 !== 0; // Odd = Northbound, Even = Southbound

        // Group by parent_station if available, or derive a key
        // Caltrain GTFS seems to use parent_station field (e.g. "san_francisco", "22nd_street")
        // Let's use parent_station as the grouping key.

        const parentKey = stop.parent_station || cleanName(stop.stop_name);

        if (!stationsMap[parentKey]) {
            stationsMap[parentKey] = {
                stopname: cleanName(stop.stop_name),
                urlname: stop.parent_station || '', // Use parent_station ID as urlname (it matches the API requirement often)
            };
        }

        if (isOdd) {
            stationsMap[parentKey].stop1 = stop.stop_id;
            // Use Northbound coordinates as the station coordinates (arbitrary choice, usually close enough)
            stationsMap[parentKey].lat = parseFloat(stop.stop_lat);
            stationsMap[parentKey].lon = parseFloat(stop.stop_lon);
        } else {
            stationsMap[parentKey].stop2 = stop.stop_id;
        }
    });

    // Convert map to array and filter incomplete entries
    const stations: Station[] = Object.values(stationsMap)
        .filter(s => s.stop1 && s.stop2 && s.stopname && s.lat && s.lon)
        .map(s => s as Station)
        .sort((a, b) => parseInt(a.stop1) - parseInt(b.stop1)); // Sort North to South

    fs.writeFileSync(outputPath, JSON.stringify(stations, null, 2));
};

buildStations();
