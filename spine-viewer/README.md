# Spine Animation Player (VS Code Extension)

Production-focused Spine export preview and playback inside VS Code.

## Overview

Spine Animation Player validates a Spine export folder, resolves a compatible runtime, and opens an interactive player for animation and skin preview.

## Production Specification

### Invocation

- Explorer folder context action: `ToolBuddy: Open Spine Player`
- Command Palette command: `ToolBuddy: Open Spine Player`

### Bundle Validation and Selection

- Validates selected folder as a Spine bundle before opening.
- Requires:
  - Skeleton `.json`
  - Atlas `.atlas`
  - Atlas page images (`.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`)
- If multiple skeleton or atlas files exist, selects the most compatible pair using naming and attachment-region matching.

### Runtime Compatibility

- Supports Spine runtime series:
  - `3.7`
  - `3.8`
- Resolves runtime from skeleton metadata and loads the matching bundled player runtime.
- Rejects unsupported Spine major/minor versions with a user-visible error.

### Viewer Behavior

- Opens a dedicated webview panel for the selected folder.
- Provides animation and skin selectors from parsed skeleton data.
- Includes playback controls:
  - Play/Pause
  - Loop toggle
- Auto-selects an initial animation using runtime-safe heuristics.
- Detects premultiplied alpha markers from atlas data and naming patterns.

### Asset Integrity Checks

- Validates that atlas-referenced image pages exist.
- Validates that at least one animation is present in the selected skeleton.
- Returns explicit errors for incomplete or invalid bundles.

## Operational Limits and Error Conditions

- Folders without a complete Spine bundle are rejected.
- Unsupported runtime versions are rejected.
- Missing atlas page files are rejected.

## Data Handling

- Processes files locally within the selected workspace folder.
- Does not require external services for parsing or playback setup.

## Compatibility

- Visual Studio Code `1.90.0` or higher.

## Support

- Issues and feature requests: [GitHub Issues](https://github.com/toolbuddy-io/code-extension/issues)

## License

MIT License. See [LICENSE](LICENSE).
