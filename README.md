# Code Extension Repository

This branch contains the ToolBuddy Texture Packer VS Code extension only.

## Branch model

- `master`: empty coordination branch (no extension source)
- `spine-viewer`: Spine Viewer extension source
- `texture-packer`: Texture Packer extension source (this branch)

## Extension location

- `texture-packer/`

## Local run

```bash
cd texture-packer
npm install
# Press F5 in VS Code to launch Extension Development Host
```

## Package

```bash
cd texture-packer
npx vsce package
```

## Publish

```bash
cd texture-packer
npx vsce login <publisher>
npx vsce publish
```
