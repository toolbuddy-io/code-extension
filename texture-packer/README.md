# Texture Packer (VS Code Extension)

Texture Packer lets you right-click a folder in VS Code, scan nested images, preview the selection, and export a sprite atlas package for common game engines.

## Features

- Explorer folder context action: `ToolBuddy: Create Sprite Atlas`
- Recursive nested image scan
- View selected files before export
- Delete selected files from the source folder
- Width and height dropdowns with `1024` and `2048`
- Scale dropdown with `0.25`, `0.5`, `0.75`, `1`, `1.5`, `2.0`
- Multipack enabled automatically
- Smooth scale mode by default
- Output formats:
  - Cocos
  - Unity
  - Phaser
  - CSS
  - Json
- Optional move-sprites-into-folder workflow before export
- Export filename dialog with fallback to the parent folder name

## How To Use

1. In VS Code Explorer, right-click a folder.
2. Click `ToolBuddy: Create Sprite Atlas`.
3. Select or deselect the nested images you want to pack.
4. Adjust layout, sprite, and output options.
5. Click `Export Package`.

## Notes

- Supported source formats: `.png`, `.jpg`, `.jpeg`, `.webp`
- Atlas packing uses `free-tex-packer-core`
- Generated atlas image paths are tracked in a local `.toolbuddy-texture-packer.json` file so the extension can ignore its own prior atlas pages when rescanning

## Local Dev

```bash
npm install
npm run package
```

## Publish

```bash
npx vsce login <publisher>
npx vsce publish
```
