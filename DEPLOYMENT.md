# TrackTrain Deployment Guide

Production-ready deployment instructions for TrackTrain - Real-time Caltrain tracking application.

## Prerequisites

- Node.js 20+ (for local builds)
- Docker & Docker Compose (for containerized deployment)
- Environment variables configured (see `.env.example`)

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Access at http://localhost:3000
```

## Production Build

### Option 1: Local Build & Run

```bash
# Build the application
npm run build

# Start production server
npm start

# Access at http://localhost:3000
```

### Option 2: Docker Container

#### Build Docker Image
```bash
npm run build:docker
# or
docker build -t railtime:latest .
```

#### Run with Docker
```bash
# Start in foreground
npm run start:docker

# Start in background
npm run start:docker:detached

# Stop Docker containers
npm run stop:docker
```

#### Manual Docker Run
```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_CALTRAIN_API=https://api.511.org \
  railtime:latest
```

## Environment Configuration

Create a `.env.local` file (copy from `.env.example`):

```env
NEXT_PUBLIC_CALTRAIN_API=https://api.511.org
```

## Production Deployment Checklist

- [ ] Environment variables configured
- [ ] Source maps disabled (configured in `next.config.ts`)
- [ ] Compression enabled (configured in `next.config.ts`)
- [ ] Build tested locally
- [ ] Docker image builds successfully
- [ ] Health checks passing
- [ ] Monitoring configured (if applicable)

## Build Output

The production build creates a standalone output in `.next/standalone/`:
- Minimal dependencies included
- Ready for Docker or any Node.js host
- Optimized for size and performance

## Performance Optimizations

- Static page generation for `/`, `/compare`, `/api` endpoints
- Image optimization (unoptimized for API data, optimized for static assets)
- CSS minification and tree-shaking enabled
- JavaScript code splitting per route
- Browser source maps disabled in production

## Monitoring & Logging

The application logs to stdout/stderr. In Docker:
```bash
docker logs <container-id>
docker-compose logs app
```

## Troubleshooting

### Build Fails
```bash
# Clear Next.js cache and rebuild
rm -rf .next
npm run build
```

### Port Already in Use
```bash
# Run on different port
PORT=3001 npm start

# Or with Docker
docker run -p 3001:3000 railtime:latest
```

### API Connectivity Issues
- Verify `NEXT_PUBLIC_CALTRAIN_API` environment variable
- Check network connectivity to Caltrain API
- Check browser console for CORS issues

## Architecture

- **Frontend**: Next.js 16 with React 19
- **Styling**: Tailwind CSS 4
- **State Management**: React hooks + Context API
- **Data Fetching**: Server-side API calls
- **Visualizations**: Custom React components + Leaflet maps

## Scaling Considerations

- Static prerendering reduces database load
- API calls cached at 10-second intervals
- Standalone output enables easy horizontal scaling
- Docker deployment ready for orchestration (Kubernetes, etc.)
