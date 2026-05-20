# Spine Animation Player (VS Code Extension)

Spine Animation Player lets you open a Spine export folder inside VS Code and use two features:

- Play animation
- Update skin

Supported runtime versions in this extension build:

- Spine 3.7
- Spine 3.8

For advanced tools and full feature set, use [ToolBuddy Spine Viewer](https://www.toolbuddy.io/spine-viewer).

## How To Use

1. In VS Code Explorer, right-click a folder that contains Spine export files.
2. Click `ToolBuddy: Open Spine Animation Player`.
3. Use animation and skin dropdowns in the player panel.

You can also run the command from Command Palette and pick a folder.

## Required Files In Folder

- Skeleton `.json`
- `.atlas` or `.skel`
- Atlas page image files (`.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`)

## Rate And Support

- Rate extension in VS Code Marketplace from command: `ToolBuddy: Rate Spine Animation Player`
- Star GitHub repo from command: `ToolBuddy: Star Spine Animation Player on GitHub`

## Local Dev

```bash
npm install
npm run package
```
