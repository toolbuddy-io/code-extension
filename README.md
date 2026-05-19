# Code Extension Repo

This repository contains VS Code extensions published by ToolBuddy.

## Current extension

- `spine-viewer/`
  - Play Spine animation
  - Switch Spine skin
  - Run from command palette and Explorer folder context menu

## Local run

```bash
cd spine-viewer
npm install
# Press F5 in VS Code to launch Extension Development Host
```

## Package

```bash
cd spine-viewer
npx vsce package
```

## Publish

```bash
cd spine-viewer
npx vsce login <publisher>
npx vsce publish
```
