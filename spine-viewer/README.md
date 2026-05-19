# ToolBuddy Spine Viewer (VS Code Extension)

Spine Viewer extension extracted from ToolBuddy runtime logic.

## Current scope

- Enabled:
- Play/pause animation
- Switch skin

- Locked (not enabled in this version):
- Timeline sequencing
- Export (GIF/video)
- Debug overlays
- Speed, grid, and pan controls

For advanced controls and full feature set, use ToolBuddy Spine Viewer:
- https://www.toolbuddy.io/spine-viewer

## Install locally

1. Open this folder in VS Code:
   - `extension/vs-code/spine-viewer`
2. Run:
   - `npm install`
3. Press `F5` to launch Extension Development Host.
4. Run command:
   - `ToolBuddy: Open Spine Viewer`
5. Select a Spine export folder containing:
   - skeleton `.json`
   - `.atlas`
   - atlas page image files (`.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`)

## Run from Explorer folder

1. In VS Code Explorer, right-click a folder.
2. Select `ToolBuddy: Open Spine Viewer`.
3. Extension validates the folder has Spine bundle files before launching.

## Publish

1. Set your publisher in `package.json`.
2. Login to `vsce` and publish:
   - `npx vsce login <publisher>`
   - `npx vsce publish`

## Notes

- Runtime JS/CSS are loaded from UNPKG (`@esotericsoftware/spine-player@4.2.115`).
- Extraction and JSON/atlas pairing logic are in:
  - `src/spine-extraction.js`
