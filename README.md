# 🚂 RailTime

**Real-time Caltrain tracking with live positions, accurate predictions, and beautiful visualizations.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Features

- 🚆 **Real-time Train Tracking** - Live GPS positions updated every 10 seconds
- ⏱️ **Accurate Predictions** - GTFS-RT predictions merged with static schedules
- 🎨 **Beautiful Visualizations** - Animated train approach view with multiple themes
- ⚡ **Delay Indicators** - Instant on-time/delayed/early status with color coding
- 📍 **Smart Station Selection** - Quick collapsible route selector
- 🌓 **4 Stunning Themes** - Default, Cyberpunk, Midnight, Sunset
- 📱 **Fully Responsive** - Works perfectly on mobile and desktop
- 🔄 **Auto-refresh** - Live data updates every 30-60 seconds

---

## 🎯 Quick Start

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/railtime.git
cd railtime

# Install dependencies
npm install

# Build GTFS schedule data (IMPORTANT: Run this first!)
npm run build-schedule

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## 🚀 Deploy to Cloudflare Pages

### Option 1: Connect GitHub Repository (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/railtime.git
   git push -u origin main
   ```

2. **Configure Cloudflare Pages**
   - Go to [Cloudflare Pages](https://pages.cloudflare.com/)
   - Click "Create a project" → "Connect to Git"
   - Select your `railtime` repository

3. **Build Settings**
   ```
   Framework preset: Next.js
   Build command: npm run build
   Build output directory: .next
   Root directory: (leave empty)
   Environment variables: (none required)
   ```

4. **Deploy**
   - Click "Save and Deploy"
   - Your app will be live at `https://railtime-xxx.pages.dev`

### Option 2: Deploy via Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
npx @cloudflare/next-on-pages

# Or use the Pages CLI
wrangler pages deploy .next
```

### Custom Domain

In Cloudflare Pages → Settings → Custom domains:
- Add `railtime.yourdomain.com`
- DNS will be configured automatically

---

## 🏗️ Architecture

### Data Flow

```
GTFS Static Data (Build Time)
    ├─→ gtfs_data/stops.txt
    ├─→ gtfs_data/stop_times.txt
    ├─→ gtfs_data/trips.txt
    └─→ npm run build-schedule
        ├─→ lib/schedule-data.json (trip schedules)
        └─→ lib/trip-stops-data.json (complete stop lists)

Real-time APIs (Runtime)
    ├─→ Predictions API (30s refresh)
    │   └─→ /api/predictions
    │       ├─→ Fetches Caltrain GTFS-RT
    │       ├─→ Merges with static schedules
    │       └─→ Calculates delays
    │
    └─→ Vehicle Positions API (10s refresh)
        └─→ /api/vehicle-positions
            ├─→ Fetches 511.org Transit API
            ├─→ Matches trains by TripId
            └─→ Returns GPS coordinates
```

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI (Shadcn patterns)
- **Icons**: Lucide React
- **Maps**: Leaflet + React-Leaflet
- **Data**: GTFS Static + GTFS-RT
- **Deployment**: Cloudflare Pages
- **APIs**: Next.js Edge Runtime

---

## 📁 Project Structure

```
railtime/
├── app/
│   ├── api/
│   │   ├── predictions/route.ts       # Train predictions endpoint
│   │   └── vehicle-positions/route.ts # Real-time GPS positions
│   ├── page.tsx                       # Main dashboard
│   └── globals.css                    # Global styles
│
├── components/
│   ├── CaltrainDisplay.tsx            # Main dashboard component
│   ├── TrainApproachView.tsx          # Animated train visualization
│   ├── SettingsModal.tsx              # User preferences
│   └── ui/                            # Shadcn UI components
│
├── lib/
│   ├── caltrain.ts                    # Data fetching utilities
│   ├── types.ts                       # TypeScript interfaces
│   ├── stations.json                  # Station metadata
│   ├── schedule-data.json             # Pre-built schedules (generated)
│   └── trip-stops-data.json           # Trip-to-stops mapping (generated)
│
├── gtfs_data/                         # GTFS static files
│   ├── stops.txt
│   ├── stop_times.txt
│   ├── trips.txt
│   └── ... (other GTFS files)
│
├── scripts/
│   └── build-schedule.ts              # GTFS data processor
│
├── public/                            # Static assets
│
└── docs/                              # Documentation
    ├── DATA_SOURCES.md                # Data architecture
    ├── TRANSIT_ARCHITECTURE.md        # System design
    ├── DELAY_LOGIC.md                 # Delay calculation logic
    └── MICRO_UX_IMPROVEMENTS.md       # UX enhancements
```

---

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev                 # Start dev server (localhost:3000)

# Building
npm run build               # Build for production
npm run build-schedule      # Process GTFS data (run before build)
npm run start               # Start production server

# Code Quality
npm run lint                # Run ESLint
```

### Key Features Explained

#### 1. Delay Calculation
Compares real-time predictions vs GTFS static schedule:
- **On-time**: Within ±2 minutes
- **Early**: More than 2 minutes early
- **Delayed**: More than 2 minutes late

See [DELAY_LOGIC.md](docs/DELAY_LOGIC.md) for details.

#### 2. Complete Stop Lists
The Predictions API only returns stops for the queried station. We solve this by:
- Pre-processing GTFS `stop_times.txt` at build time
- Creating `trip-stops-data.json` mapping `trip_id → [all stop_ids]`
- Merging at runtime for complete route visualization

See [DATA_SOURCES.md](docs/DATA_SOURCES.md) for data flow.

#### 3. Train Position Interpolation
GPS positions are interpolated between stations for smooth animations:
- Calculate distance to nearest 2 stations
- Determine which segment train is on
- Interpolate position based on distances

---

## 🎨 Themes

Switch themes via the 🎨 palette icon in Train Approach View:

- **Default** - Clean slate with yellow accents
- **Cyberpunk** - Neon cyan with animated grid
- **Midnight** - Deep indigo and purple
- **Sunset** - Warm orange and rose gradients

---

## 🔧 Configuration

### Update GTFS Data

Caltrain updates GTFS periodically. To update:

1. Download latest from [Caltrain Developer Resources](https://www.caltrain.com/developer-resources)
2. Extract to `gtfs_data/` (replace existing)
3. Run `npm run build-schedule`
4. Commit updated `schedule-data.json` and `trip-stops-data.json`

### Customize Refresh Intervals

**Predictions** (in `CaltrainDisplay.tsx`):
```typescript
const interval = setInterval(loadPredictions, 60000); // 60s
```

**Vehicle Positions** (in `TrainApproachView.tsx`):
```typescript
const interval = setInterval(fetchPos, 10000); // 10s
```

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md).

### Quick Start for Contributors

1. Fork the repo
2. Create a branch: `git checkout -b feature/amazing-feature`
3. Make changes
4. Run `npm run lint`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Caltrain** - GTFS and GTFS-RT data
- **511.org** - Real-time vehicle positions
- **Next.js Team** - Amazing framework
- **Shadcn** - Beautiful UI components
- **Vercel** - Tailwind CSS

---

## 📮 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/railtime/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/railtime/discussions)

---

## 🗺️ Roadmap

- [ ] Multi-agency support (BART, MUNI, etc.)
- [ ] Service alerts integration
- [ ] Historical delay analytics
- [ ] Push notifications
- [ ] Progressive Web App (PWA)
- [ ] Trip planning
- [ ] Accessibility (ARIA labels, screen readers)
- [ ] Mobile apps (React Native)

---

## ⚖️ Disclaimer

RailTime is an independent application and is not affiliated with, endorsed by, or sponsored by Caltrain or the Peninsula Corridor Joint Powers Board. All Caltrain trademarks and copyrighted materials are property of their respective owners. Data provided "as is" without warranties.

---

**Built with ❤️ for the Caltrain community**

[⭐ Star this repo](https://github.com/yourusername/railtime) if you find it useful!
