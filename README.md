# Code Extension Repo

This repository contains VS Code extensions published by ToolBuddy.

## Extensions

- `spine-viewer/`
  - Play Spine animation
  - Switch Spine skin
  - Run from command palette and Explorer folder context menu
- `texture-packer/`
  - Scan nested image folders
  - Build sprite atlases from Explorer folder right-click
  - Export atlas packages for Cocos, Unity, Phaser, CSS, and Json

## Local run

```bash
cd spine-viewer
npm install
# Press F5 in VS Code to launch Extension Development Host
```

```bash
cd texture-packer
npm install
# Press F5 in VS Code to launch Extension Development Host
```

## Package

```bash
cd spine-viewer
npx vsce package
```

```bash
cd texture-packer
npx vsce package
```

## Publish

```bash
cd spine-viewer
npx vsce login <publisher>
npx vsce publish
```

```bash
cd texture-packer
npx vsce login <publisher>
npx vsce publish
```
