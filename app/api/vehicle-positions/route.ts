import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'edge';

export async function GET() {
    try {
        const response = await fetch("https://www.caltrain.com/files/rt/vehiclepositions/CT.json", {
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`External API responded with ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
            }
        });
    } catch (error) {
        console.error("Error fetching vehicle positions:", error);
        return NextResponse.json({ error: "Failed to fetch vehicle positions" }, { status: 500 });
    }
}
