# Texture Packer (VS Code Extension)

Texture Packer brings sprite atlas generation directly into Visual Studio Code. It scans nested image folders, lets you control packing behavior, and exports atlas packages for common game engines without leaving your workspace.

## Features

- Folder context command in Explorer: `ToolBuddy: Create Sprite Atlas`
- Recursive scan of nested folders
- Source support for `.png`, `.jpg`, `.jpeg`, and `.webp`
- Three-panel workspace for selection, preview, and configuration
- Atlas preview controls for zoom, page switching, and outline visibility
- Layout size options from `512` to `4096`
- Size constraint modes: `Any size`, `Power of two`, `Square`, `Power-of-two square`
- Scale options from `0.25` to `2.0`
- Sprite controls for padding, extrude, trim, rotation, and identical-sprite detection
- Multipack output using the ToolBuddy-refined packing flow
- Export metadata targets: `Cocos`, `Unity`, `Phaser`, `CSS`, `Json`
- Optional workflow to move selected sprites into a dedicated folder before export
- Download flow with naming prompt and automatic parent-folder fallback

## Getting Started

1. In VS Code Explorer, right-click a folder.
2. Click `ToolBuddy: Create Sprite Atlas`.
3. Review scanned files and remove any item you do not want included.
4. Configure layout, sprite, and output settings.
5. Click `Download`, then choose the destination and file name.

## Commands

- `ToolBuddy: Create Sprite Atlas`  
  Opens the Texture Packer panel for the selected folder and scans supported images.

## Requirements

- Visual Studio Code `1.90.0` or higher

## Notes

- Atlas generation is powered by `free-tex-packer-core` with ToolBuddy-aligned refinement logic.
- Generated atlas pages are tracked in `.toolbuddy-texture-packer.json` to prevent previously exported pages from being re-ingested on future scans.
- Original product reference: [ToolBuddy Texture Packer](https://www.toolbuddy.io/texturepacker)

## Known Issues

- Very large source folders can take longer to scan and preview, especially with high-resolution assets.

## Found a bug?

To file a new issue, go to Visual Studio Code's `Help > Report Issue`.

In the popup UI:
- Select `An extension` in the `File on` dropdown.
- Select `Texture Packer` in the extension dropdown.

Submitting this form will open the issue flow on GitHub.

Alternatively, file an issue directly on the GitHub repository:  
[https://github.com/toolbuddy-io/code-extension/issues](https://github.com/toolbuddy-io/code-extension/issues)

## Release Notes

### 0.1.1

- Refined Marketplace description and section structure
- Added issue-reporting, contribution, and license links
- Removed unused direct dependency (`xmlbuilder`)

### 0.1.0

- Initial public release
- Explorer folder action to create sprite atlases
- Nested image scanning with PNG/JPG/JPEG/WebP support
- ToolBuddy-style layout, sprite, and output controls
- Multi-atlas preview with zoom and outline toggle
- Export/download workflow for Cocos, Unity, Phaser, CSS, and Json metadata formats

## Contributing

Contributions are welcome. Please feel free to submit a Pull Request on GitHub:  
[https://github.com/toolbuddy-io/code-extension/pulls](https://github.com/toolbuddy-io/code-extension/pulls)

## License

This extension is licensed under the MIT License:  
[https://github.com/toolbuddy-io/code-extension/blob/texture-packer/texture-packer/LICENSE](https://github.com/toolbuddy-io/code-extension/blob/texture-packer/texture-packer/LICENSE)
