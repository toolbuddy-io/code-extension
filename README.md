# Spine Animation Player (VS Code Extension)

Open-source Spine export playback and validation for production review inside VS Code.

## Overview

Spine Animation Player verifies Spine export folders, resolves compatible runtime assets, and opens an interactive player for animation and skin inspection.

## Production Specification

### Entry Point

- Explorer folder context action: `ToolBuddy: Open Spine Player`
- Command Palette command: `ToolBuddy: Open Spine Player`

### Bundle Requirements

- Skeleton file: `.json`
- Atlas file: `.atlas`
- Atlas page images: `.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`

### Runtime Support

- Supported Spine series: `3.7`, `3.8`
- Runtime is auto-selected from skeleton metadata.
- Unsupported versions are blocked with explicit user-facing errors.

### Validation and Selection Logic

- Verifies selected folder is a complete Spine bundle.
- Resolves the best skeleton-atlas pairing when multiple candidates are present.
- Ensures atlas image references are valid before viewer launch.
- Requires at least one animation in the selected skeleton.

### Viewer Capabilities

- Interactive animation and skin selection
- Play/Pause control
- Loop toggle
- Runtime-specific player loading for supported Spine versions

### Operational Behavior

- Fails fast for incomplete bundles or missing assets.
- Shows clear error messages directly in VS Code.

## Data Handling

- Operates locally on workspace files.
- No external service dependency for validation or playback setup.

## Compatibility

- Visual Studio Code `1.90.0` or higher.

## Support

- Issues and feature requests: [GitHub Issues](https://github.com/toolbuddy-io/code-extension/issues)

## License

MIT License. See [LICENSE](LICENSE).
