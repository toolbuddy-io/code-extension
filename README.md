# Texture Packer (VS Code Extension)

Open-source sprite atlas generation for production art pipelines inside VS Code.

## Overview

Texture Packer scans nested image folders, allows selective sprite inclusion, and exports atlas packages with engine-ready metadata.

## Production Specification

### Entry Point

- Explorer folder context action: `ToolBuddy: Create Sprite Atlas`
- Command Palette command: `ToolBuddy: Create Sprite Atlas`

### Input Scope

- Recursively scans the selected folder.
- Accepts source sprites in `.png`, `.jpg`, `.jpeg`, and `.webp`.
- Excludes generated atlas pages tracked in `.toolbuddy-texture-packer.json`.

### Packing Controls

- Atlas sizes: `512`, `1024`, `2048`, `4096`
- Size constraints: `Any size`, `Power of two`, `Square`, `Power-of-two square`
- Scale options: `0.25`, `0.5`, `0.75`, `1`, `1.5`, `2.0`
- Sprite settings: padding, extrude, alpha threshold, trim, rotation, identical detection

### Output Targets

- Metadata exporters: `Cocos`, `Unity`, `Phaser`, `CSS`, `Json`
- Multi-page atlas output when needed
- Optional source reorganization into a dedicated sprites folder before export

### Operational Behavior

- Real-time atlas preview with page switching, zoom, and outline toggle
- User-controlled sprite selection and exclusion
- Clear runtime errors for invalid source sets and unsupported files

## Data Handling

- Operates locally on workspace files.
- No external service dependency for atlas generation.

## Compatibility

- Visual Studio Code `1.90.0` or higher.

## Support

- Issues and feature requests: [GitHub Issues](https://github.com/toolbuddy-io/code-extension/issues)

## License

MIT License. See [LICENSE](LICENSE).
