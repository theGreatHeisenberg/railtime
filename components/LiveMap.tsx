"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { VehiclePosition } from "@/lib/types";
import { fetchVehiclePositions } from "@/lib/caltrain";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon in Leaflet with Next.js/Webpack
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const trainIcon = new L.DivIcon({
    className: "bg-transparent",
    html: `<div class="flex items-center justify-center w-8 h-8 bg-yellow-500 rounded-full border-2 border-white shadow-lg text-lg">🚆</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

function MapUpdater({ positions }: { positions: VehiclePosition[] }) {
    const map = useMap();

    useEffect(() => {
        if (positions.length > 0) {
            // Calculate bounds to fit all trains
            const bounds = L.latLngBounds(
                positions.map(p => [p.Vehicle.Position.Latitude, p.Vehicle.Position.Longitude])
            );
            // Add some padding
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        }
    }, [positions, map]);

    return null;
}

export default function LiveMap() {
    const [positions, setPositions] = useState<VehiclePosition[]>([]);

    useEffect(() => {
        const loadPositions = async () => {
            const data = await fetchVehiclePositions();
            setPositions(data);
        };

        loadPositions();
        const interval = setInterval(loadPositions, 10000); // Update every 10 seconds
        return () => clearInterval(interval);
    }, []);

    // Default center (San Mateo)
    const center: [number, number] = [37.5629917, -122.3255254];

    return (
        <div className="h-[400px] w-full rounded-xl overflow-hidden border-4 border-slate-800 shadow-2xl relative z-0">
            <MapContainer
                center={center}
                zoom={10}
                style={{ height: "100%", width: "100%" }}
                className="z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {positions.map((pos) => (
                    <Marker
                        key={pos.Id}
                        position={[pos.Vehicle.Position.Latitude, pos.Vehicle.Position.Longitude]}
                        icon={trainIcon}
                    >
                        <Popup className="font-mono">
                            <div className="text-slate-900">
                                <div className="font-bold">Train #{pos.Vehicle.Trip.TripId}</div>
                                <div>Dir: {pos.Vehicle.Trip.DirectionId === 0 ? "NB" : "SB"}</div>
                                <div className="text-xs text-slate-500">
                                    Updated: {new Date(pos.Vehicle.Timestamp * 1000).toLocaleTimeString()}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
