# RailTime Documentation

This directory contains technical documentation and development notes for RailTime.

## Documentation Files

### Architecture & Design

- **[TRANSIT_ARCHITECTURE.md](TRANSIT_ARCHITECTURE.md)** - Complete system architecture analysis
  - Data flow diagrams
  - API integrations
  - Component structure
  - Technology stack overview

- **[DATA_SOURCES.md](DATA_SOURCES.md)** - Data source documentation
  - GTFS Static data usage
  - GTFS-RT predictions API
  - Vehicle positions API
  - Build-time data processing

### Feature Documentation

- **[DELAY_LOGIC.md](DELAY_LOGIC.md)** - Train delay calculation logic
  - ±2 minute threshold explanation
  - Delay status determination
  - Visual indicator implementation

- **[MICRO_UX_IMPROVEMENTS.md](MICRO_UX_IMPROVEMENTS.md)** - Detailed UX enhancement notes
  - Color consistency improvements
  - Station selector reorganization
  - Next Train banner redesign
  - Complete before/after comparisons

- **[QUICK_WINS_SUMMARY.md](QUICK_WINS_SUMMARY.md)** - Summary of quick UX improvements
  - Debug logging removal
  - Delay indicators
  - Visual enhancements

### Development Notes

- **[claude.md](claude.md)** - AI assistant context file
  - Project overview
  - Tech stack summary
  - Development focus areas

- **[BRANDING.md](BRANDING.md)** - Branding ideas and name suggestions
  - Logo concepts
  - Color schemes
  - Brand identity notes

## Quick Links

- [Main README](../README.md) - Project overview and setup instructions
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute
- [License](../LICENSE) - MIT License

## For Developers

When working on new features:

1. Review relevant architecture docs first
2. Update documentation when making significant changes
3. Add new docs for complex features
4. Keep documentation in sync with code

## Documentation Standards

- Use Markdown format
- Include code examples where helpful
- Add diagrams for complex flows
- Keep language clear and concise
- Update dates when making changes
