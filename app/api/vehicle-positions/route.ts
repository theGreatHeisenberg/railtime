import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const response = await fetch("https://www.caltrain.com/files/rt/vehiclepositions/CT.json");

        if (!response.ok) {
            throw new Error(`External API responded with ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching vehicle positions:", error);
        return NextResponse.json({ error: "Failed to fetch vehicle positions" }, { status: 500 });
    }
}
