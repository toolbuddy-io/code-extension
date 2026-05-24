# Texture Packer (VS Code Extension)

Production-focused sprite atlas generation for VS Code workspaces.

## Overview

Texture Packer scans image folders, packs selected sprites into one or more atlas pages, and exports engine-ready metadata and textures directly from VS Code.

## Production Specification

### Invocation

- Explorer folder context action: `ToolBuddy: Create Sprite Atlas`
- Command Palette command: `ToolBuddy: Create Sprite Atlas`

### Source Discovery

- Recursively scans the selected folder.
- Ignores `.git`, `.vscode`, and `node_modules`.
- Includes source images with `.png`, `.jpg`, `.jpeg`, and `.webp`.
- Excludes previously generated atlas pages listed in `.toolbuddy-texture-packer.json`.

### Packing and Preview

- Interactive selection and exclusion of sprites before export.
- Real-time atlas preview with multi-page navigation, zoom controls, and outline toggle.
- Layout controls:
  - Atlas size: `512`, `1024`, `2048`, `4096`
  - Constraints: `Any size`, `Power of two`, `Square`, `Power-of-two square`
  - Scale: `0.25`, `0.5`, `0.75`, `1`, `1.5`, `2.0`
- Sprite controls:
  - Padding
  - Extrude
  - Alpha threshold
  - Rotation
  - Trim
  - Identical sprite detection
  - File extension removal
  - Folder prefixing

### Export Targets

- Metadata exporters:
  - `Cocos`
  - `Unity`
  - `Phaser`
  - `CSS`
  - `Json`
- Uses multipack heuristics to minimize atlas count and total atlas area.

### File System Operations

- Writes exported atlas files into the selected folder.
- Optional: moves selected source sprites into a dedicated source folder before export.
- Maintains `.toolbuddy-texture-packer.json` as a local manifest for generated atlas tracking.

## Supported Input

- Folder-based workflow only.
- Supported source image formats: `.png`, `.jpg`, `.jpeg`, `.webp`.
- WebP inputs are converted for packing compatibility during processing.

## Output Artifacts

- One or more atlas page images.
- Exporter-specific metadata files.
- Local manifest file: `.toolbuddy-texture-packer.json`.

## Operational Limits and Error Conditions

- Requires at least one selected sprite for export.
- Returns clear errors for unsupported or invalid images.
- Large or high-resolution sprite sets can increase preview and export time.

## Data Handling

- Processes files locally within the selected workspace folder.
- Does not require external services for atlas generation.

## Compatibility

- Visual Studio Code `1.90.0` or higher.

## Support

- Issues and feature requests: [GitHub Issues](https://github.com/toolbuddy-io/code-extension/issues)

## License

MIT License. See [LICENSE](LICENSE).
