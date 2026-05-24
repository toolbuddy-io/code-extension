# Code Extension Repository

This branch contains the ToolBuddy Spine Viewer VS Code extension only.

## Branch model

- `master`: empty coordination branch (no extension source)
- `spine-viewer`: Spine Viewer extension source (this branch)
- `texture-packer`: Texture Packer extension source

## Extension location

- `spine-viewer/`

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
