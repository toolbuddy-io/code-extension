# Spine Animation Player (VS Code Extension)

Spine Animation Player brings Spine export preview directly into Visual Studio Code. It validates bundles, resolves runtime compatibility, and provides interactive animation and skin playback without leaving your workspace.

## Features

- Folder context command in Explorer: `ToolBuddy: Open Spine Player`
- Command Palette support with folder picker
- Spine bundle validation before viewer launch
- Runtime compatibility for Spine `3.7` and `3.8`
- Automatic best-match pairing for skeleton and atlas files in complex folders
- Animation selector and skin selector
- Playback controls for play/pause and loop
- Atlas image reference verification with clear error messages
- Local processing workflow (no external service dependency)

## Getting Started

1. In VS Code Explorer, right-click a folder that contains a Spine export.
2. Click `ToolBuddy: Open Spine Player`.
3. Use animation and skin controls in the player panel.

You can also run the command from Command Palette and select a folder.

## Commands

- `ToolBuddy: Open Spine Player`  
  Opens the Spine player panel for a selected folder and loads a validated Spine bundle.

## Requirements

- Visual Studio Code `1.90.0` or higher
- A complete Spine export folder containing:
  - Skeleton `.json`
  - Atlas `.atlas`
  - Atlas page images (`.png`, `.jpg`, `.jpeg`, `.webp`, or `.avif`)

## Notes

- This extension supports Spine runtime series `3.7` and `3.8` only.
- If multiple skeleton or atlas candidates exist, the extension auto-selects the most compatible pair.
- Missing atlas image references are blocked before playback and reported as actionable errors.
- Extension product reference: [ToolBuddy Spine Viewer](https://www.toolbuddy.io/spine-viewer)

## Known Issues

- Very large Spine bundles can take longer to parse and initialize in the webview.
- Folders without a complete `.json` + `.atlas` + atlas page image set are rejected.

## Found a bug?

To file a new issue, go to Visual Studio Code's `Help > Report Issue`.

In the popup UI:
- Select `An extension` in the `File on` dropdown.
- Select `Spine Animation Player` in the extension dropdown.

Submitting this form will open the issue flow on GitHub.

Alternatively, file an issue directly on the GitHub repository:  
[https://github.com/toolbuddy-io/code-extension/issues](https://github.com/toolbuddy-io/code-extension/issues)

## Release Notes

### 1.0.3

- Renamed command label to `ToolBuddy: Open Spine Player`
- Updated Marketplace-facing naming consistency

### 1.0.2

- Runtime bundle limited to Spine `3.7` and `3.8`

### 1.0.0

- Folder-aware Explorer integration
- Initial stabilized Spine player release for VS Code

## Contributing

Contributions are welcome. Please feel free to submit a Pull Request on GitHub:  
[https://github.com/toolbuddy-io/code-extension/pulls](https://github.com/toolbuddy-io/code-extension/pulls)

## License

This extension is licensed under the MIT License:  
[spine-viewer/LICENSE](spine-viewer/LICENSE)
