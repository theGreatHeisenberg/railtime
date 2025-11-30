import { TrainPrediction, Station } from "./types";

/**
 * Extract ETA in minutes from a prediction's ETA string
 * Examples: "14 min" -> 14, "2 min" -> 2
 */
export const extractETAMinutes = (etaString: string): number => {
  const match = etaString.match(/\d+/);
  return match ? Math.max(0, parseInt(match[0])) : 0;
};

/**
 * Get ETA for a specific train to a specific station from predictions
 */
export const getTrainETAFromPredictions = (
  train: TrainPrediction,
  predictions: TrainPrediction[]
): number => {
  const prediction = predictions.find(p => p.TrainNumber === train.TrainNumber);
  if (prediction) {
    return extractETAMinutes(prediction.ETA);
  }
  return 0;
};

/**
 * Get absolute arrival time based on current time + ETA minutes
 */
export const getArrivalTime = (etaMinutes: number, currentTime: Date): string => {
  if (etaMinutes < 0) return "Loading...";
  const arrivalDate = new Date(currentTime.getTime() + etaMinutes * 60000);
  // Format time in Pacific timezone
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles'
  };
  return arrivalDate.toLocaleTimeString('en-US', options);
};

/**
 * Calculate distance between two lat/lon points using Haversine formula
 */
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculate normalized percent positions for stations based on geographic distance
 */
const calculateStationPercents = (stations: Station[]): Map<string, number> => {
  const sortedStations = [...stations].sort((a, b) => parseInt(a.stop1) - parseInt(b.stop1));

  let totalDist = 0;
  const stationDistances = sortedStations.map((station, i) => {
    if (i > 0) {
      const prev = sortedStations[i - 1];
      totalDist += getDistance(prev.lat, prev.lon, station.lat, station.lon);
    }
    return { name: station.stopname, dist: totalDist };
  });

  const percentMap = new Map<string, number>();
  stationDistances.forEach(({ name, dist }) => {
    percentMap.set(name, totalDist > 0 ? (dist / totalDist) * 100 : 0);
  });

  return percentMap;
};

/**
 * Calculate ETAs for all stations in the journey
 * Uses direct prediction data for the origin/destination,
 * then interpolates for intermediate stations
 */
export const calculateStationETAs = (
  train: TrainPrediction,
  origin: string,
  destination: string | undefined,
  stations: Station[],
  originPredictions: TrainPrediction[],
  destinationPredictions: TrainPrediction[],
  currentTime: Date
): Map<string, { etaMinutes: number; arrivalTime: string }> => {
  const etaMap = new Map<string, { etaMinutes: number; arrivalTime: string }>();

  // Get ETAs directly from predictions
  const etaToOrigin = getTrainETAFromPredictions(train, originPredictions);
  const etaToDestination = destination
    ? getTrainETAFromPredictions(train, destinationPredictions)
    : etaToOrigin;

  // Calculate station percent positions
  const stationPercents = calculateStationPercents(stations);
  const originPercent = stationPercents.get(origin) ?? 0;
  const destPercent = stationPercents.get(destination ?? "") ?? 100;

  if (originPercent === 0 && origin !== stations[0]?.stopname) {
    // Origin not found
    return etaMap;
  }

  // For each station, calculate its ETA based on distance ratio
  stations.forEach(station => {
    const stationPercent = stationPercents.get(station.stopname) ?? 0;
    let stationEta = 0;

    // Handle both South Bound (destPercent > originPercent) and North Bound (destPercent < originPercent)
    if (destPercent > originPercent) {
      // South Bound: destination is further south
      if (stationPercent <= originPercent) {
        // Station is at or before origin
        stationEta = stationPercent === 0 ? 0 : etaToOrigin * (stationPercent / originPercent);
      } else if (stationPercent <= destPercent) {
        // Station is between origin and destination
        const distFromOrigin = stationPercent - originPercent;
        const totalDist = destPercent - originPercent;
        const ratio = distFromOrigin / totalDist;
        stationEta = etaToOrigin + (etaToDestination - etaToOrigin) * ratio;
      } else {
        // Station is after destination
        stationEta = etaToDestination;
      }
    } else {
      // North Bound: destination is further north (lower percent)
      if (stationPercent >= originPercent) {
        // Station is at or before origin
        stationEta = stationPercent === 100 ? 0 : etaToOrigin * ((100 - stationPercent) / (100 - originPercent));
      } else if (stationPercent >= destPercent) {
        // Station is between origin and destination
        const distFromOrigin = originPercent - stationPercent;
        const totalDist = originPercent - destPercent;
        const ratio = distFromOrigin / totalDist;
        stationEta = etaToOrigin + (etaToDestination - etaToOrigin) * ratio;
      } else {
        // Station is after destination
        stationEta = etaToDestination;
      }
    }

    etaMap.set(station.stopname, {
      etaMinutes: Math.round(Math.max(0, stationEta)),
      arrivalTime: getArrivalTime(Math.round(stationEta), currentTime)
    });
  });

  return etaMap;
};
