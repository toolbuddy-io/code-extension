# Spine Animation Player (VS Code Extension)

Spine Animation Player brings Spine export preview directly into Visual Studio Code. It validates Spine bundle contents, resolves supported runtime assets, and opens an interactive player for animation and skin review.

## Features

- Folder context command in Explorer: `ToolBuddy: Open Spine Player`
- Command Palette support for manual folder selection
- Spine bundle validation before viewer launch
- Runtime support for Spine `3.7` and `3.8`
- Automatic skeleton and atlas pairing when multiple candidates exist
- Playback controls for animation, skin, play/pause, and loop
- Atlas page reference verification with explicit error reporting
- Local workflow without external service dependency

## Getting Started

1. In VS Code Explorer, right-click a folder that contains Spine export files.
2. Click `ToolBuddy: Open Spine Player`.
3. Use animation and skin controls in the player panel.

You can also run the command from Command Palette and select a folder manually.

## Commands

- `ToolBuddy: Open Spine Player`  
  Opens the Spine player panel for the selected folder after bundle validation.

## Requirements

- Visual Studio Code `1.90.0` or higher
- Supported Spine runtime series: `3.7`, `3.8`
- Required bundle files:
  - Skeleton `.json`
  - Atlas `.atlas`
  - Atlas page image files (`.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`)

## Notes

- The extension validates that `.json`, `.atlas`, and atlas page images exist before opening the player.
- If multiple skeleton or atlas files are present, the extension selects the most compatible pair automatically.
- Atlas references are validated before launch to prevent missing-texture playback failures.
- Original product reference: [ToolBuddy Spine Viewer](https://www.toolbuddy.io/spine-viewer)

## Known Issues

- Very large Spine export folders may take longer to scan and initialize.
- Unsupported Spine runtime versions outside `3.7` and `3.8` are rejected.

## Found a bug?

To file a new issue, go to Visual Studio Code's `Help > Report Issue`.

In the popup UI:
- Select `An extension` in the `File on` dropdown.
- Select `Spine Animation Player` in the extension dropdown.

Submitting this form will open the issue flow on GitHub.

Alternatively, file an issue directly on the GitHub repository:  
[https://github.com/toolbuddy-io/code-extension/issues](https://github.com/toolbuddy-io/code-extension/issues)

## Release Notes

### 1.0.4

- Refined Marketplace README structure and section clarity
- Updated release notes and support references

### 1.0.3

- Renamed command label to `ToolBuddy: Open Spine Player`
- Updated release naming and marketplace metadata

### 1.0.2

- Restricted runtime bundles to Spine `3.7` and `3.8`

### 1.0.0

- Added stable folder-based Spine preview flow in VS Code

## Contributing

Contributions are welcome. Please feel free to submit a Pull Request on GitHub:  
[https://github.com/toolbuddy-io/code-extension/pulls](https://github.com/toolbuddy-io/code-extension/pulls)

## License

This extension is licensed under the MIT License:  
[https://github.com/toolbuddy-io/code-extension/blob/spine-viewer/spine-viewer/LICENSE](https://github.com/toolbuddy-io/code-extension/blob/spine-viewer/spine-viewer/LICENSE)
