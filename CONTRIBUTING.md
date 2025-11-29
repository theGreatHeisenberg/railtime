# Contributing to RailTime

Thank you for your interest in contributing to RailTime! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

## Code of Conduct

We expect all contributors to be respectful and professional. Please:

- Be welcoming and inclusive
- Respect differing viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- Git
- A GitHub account

### Local Development Setup

1. **Fork the repository**
   - Visit https://github.com/yourusername/railtime
   - Click "Fork" in the top right

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/railtime.git
   cd railtime
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/yourusername/railtime.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Build GTFS schedule data**
   ```bash
   npm run build-schedule
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Open http://localhost:3000**

## Development Workflow

### Creating a Branch

Always create a new branch for your work:

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/amazing-feature
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding tests

### Making Changes

1. **Write clean, readable code**
   - Follow existing code style
   - Use TypeScript types properly
   - Add comments for complex logic

2. **Test your changes**
   ```bash
   npm run lint
   npm run build
   ```

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

   Commit message format:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding tests
   - `chore:` - Maintenance tasks

### Keeping Your Branch Updated

```bash
# Fetch latest changes
git fetch upstream

# Rebase your branch
git rebase upstream/main

# If conflicts occur, resolve them and continue
git rebase --continue
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper interfaces and types
- Avoid `any` type when possible
- Use strict mode settings

Example:
```typescript
interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
}
```

### React Components

- Use functional components with hooks
- Keep components small and focused
- Use proper prop types
- Follow React best practices

Example:
```typescript
interface StationCardProps {
  station: Station;
  onSelect: (id: string) => void;
}

export function StationCard({ station, onSelect }: StationCardProps) {
  return (
    <div onClick={() => onSelect(station.id)}>
      {station.name}
    </div>
  );
}
```

### Styling

- Use Tailwind CSS utility classes
- Follow existing color schemes
- Ensure responsive design
- Support all theme variants

### File Organization

- Place components in `components/`
- Place utilities in `lib/`
- Place API routes in `app/api/`
- Use descriptive file names

## Submitting Changes

### Pull Request Process

1. **Push your branch**
   ```bash
   git push origin feature/amazing-feature
   ```

2. **Create Pull Request**
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template

3. **PR Title Format**
   ```
   feat: add real-time service alerts
   fix: correct train position interpolation
   docs: update deployment guide
   ```

4. **PR Description Should Include**
   - What changes were made
   - Why the changes were needed
   - Screenshots (for UI changes)
   - Testing performed
   - Related issues

### PR Review Process

- A maintainer will review your PR
- Address any requested changes
- Once approved, your PR will be merged
- Delete your branch after merge

### What We Look For

✅ **Good PRs:**
- Focused on a single feature/fix
- Well-tested and documented
- Follow coding standards
- Include clear commit messages
- Update relevant documentation

❌ **Avoid:**
- Mixing multiple unrelated changes
- Breaking existing functionality
- Ignoring linting errors
- Skipping documentation updates
- Force pushing after review starts

## Reporting Bugs

### Before Reporting

1. Check existing issues
2. Try to reproduce on latest version
3. Collect relevant information

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. macOS, Windows]
- Browser: [e.g. Chrome, Safari]
- Version: [e.g. 1.0.0]

**Additional context**
Any other context about the problem.
```

## Requesting Features

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Other approaches you've thought about.

**Additional context**
Any other context or screenshots.
```

## Development Tips

### Useful Commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Rebuild GTFS schedule data
npm run build-schedule

# Run linter
npm run lint

# Start production server
npm run start
```

### Working with GTFS Data

1. Download latest GTFS from [Caltrain](https://www.caltrain.com/developer-resources)
2. Extract to `gtfs_data/` directory
3. Run `npm run build-schedule`
4. Commit updated `schedule-data.json` and `trip-stops-data.json`

### Testing Real-Time APIs

- Predictions API: http://localhost:3000/api/predictions
- Vehicle Positions API: http://localhost:3000/api/vehicle-positions

### Debugging

- Use browser DevTools
- Check console for errors
- Inspect Network tab for API calls
- Use React DevTools for component inspection

## Questions?

- Open a [Discussion](https://github.com/yourusername/railtime/discussions)
- Ask in existing issues
- Check the [README](README.md)

## Recognition

All contributors will be recognized in:
- GitHub contributors page
- Release notes (for significant contributions)
- Project documentation

Thank you for contributing to RailTime! 🚂
