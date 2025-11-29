# RailTime - Caltrain Display App Context

## Project Overview
**RailTime** is a real-time Caltrain tracking application built with Next.js. It provides live train positions, delay notifications, and accurate schedule predictions using Caltrain's GTFS-Realtime API and static GTFS schedule data.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI/Styling**: Tailwind CSS v4, Radix UI (Shadcn UI patterns), Lucide React icons
- **Maps**: Leaflet, React-Leaflet
- **Data Processing**: PapaParse (for GTFS CSVs), date-fns

## Project Structure
- **`app/`**: Next.js App Router structure.
  - `api/`: Backend API routes (e.g., `/api/predictions`).
  - `page.tsx`: Main dashboard view.
  - `globals.css`: Global styles and Tailwind directives.
- **`components/`**: Reusable React components.
  - **`TrainApproachView.tsx`**: (Active Focus) Visualizes the train's approach to stations.
- **`lib/`**: Utility functions and business logic.
  - `caltrain.ts`: Core logic for fetching and processing Caltrain data.
- **`gtfs_data/`**: Directory containing static GTFS files (e.g., `stops.txt`, `stop_times.txt`) used for schedule generation.
- **`scripts/`**: Build scripts, specifically `build-schedule.ts` for pre-processing GTFS data.

## Current Development Focus
The primary active task is refining the **Train Approach Visualization** (`components/TrainApproachView.tsx`).

### Key Objectives:
1.  **Vertical Visualization**: Moving from a horizontal view to a vertical, subway-style map.
2.  **North-Up Orientation**: Ensuring the map consistently displays North at the top, regardless of train direction (Northbound/Southbound).
3.  **Data Accuracy**:
    - Migrating station data source to `gtfs_data/stops.txt` to avoid issues like "Terminus" appearing as a station.
    - Interpolating train positions between stations for smoother visualization.
4.  **Edge Cases**:
    - Handling missing real-time vehicle position data.
    - Correctly displaying "Terminus" or end-of-line states.

## Important Files for Context
- `components/TrainApproachView.tsx`: The core component currently under heavy development.
- `lib/caltrain.ts`: Contains the data fetching and processing logic that feeds the view.
- `app/api/predictions/route.ts`: The API endpoint serving prediction data.
- `app/page.tsx`: The parent component that likely hosts the `TrainApproachView`.
