
import Papa from "papaparse";
import { Station, CaltrainResponse, TrainPrediction, VehiclePosition, VehiclePositionsResponse } from "./types";
import { format, differenceInMinutes } from "date-fns";

export const fetchVehiclePositions = async (): Promise<VehiclePosition[]> => {
    try {
        // Use our local API proxy to avoid CORS issues
        const response = await fetch("/api/vehicle-positions");
        if (!response.ok) {
            throw new Error("Failed to fetch vehicle positions");
        }
        const json: VehiclePositionsResponse = await response.json();
        return json.Entities;
    } catch (error) {
        console.error("Error fetching vehicle positions:", error);
        return [];
    }
};

import stationsData from './stations.json';

export const fetchStations = async (): Promise<Station[]> => {
    return stationsData as Station[];
};

export const fetchPredictions = async (
    station: Station
): Promise<TrainPrediction[]> => {
    // Call our own API route which handles caching and merging with static schedule
    const params = new URLSearchParams({
        station: station.urlname,
        stop1: station.stop1,
        stop2: station.stop2,
    });
    const url = `/api/predictions?${params.toString()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Failed to fetch predictions");
        }
        const predictions: TrainPrediction[] = await response.json();
        return predictions;

    } catch (error) {
        console.error(error);
        return [];
    }
};
