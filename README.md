# ToolBuddy VS Code Extensions

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Open-source VS Code extensions from ToolBuddy, managed with an isolated branch model.

The `master` branch is the repository index and intentionally does not include extension source code.

## Table of Contents

- [Overview](#overview)
- [Extensions](#extensions)
- [Branch Model](#branch-model)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

## Overview

This repository is designed for extension-level isolation.  
Each extension has its own long-lived branch, release cycle, and source history.

## Extensions

| Extension | Source Branch | Purpose |
| --- | --- | --- |
| Spine Viewer | [`spine-viewer`](https://github.com/toolbuddy-io/code-extension/tree/spine-viewer) | Preview and play Spine export folders in VS Code. |
| Texture Packer | [`texture-packer`](https://github.com/toolbuddy-io/code-extension/tree/texture-packer) | Create sprite atlases from image folders in VS Code. |

## Branch Model

- `master`: repository hub (project-level docs and policies).
- One extension per branch (`spine-viewer`, `texture-packer`, and future extension branches).
- Extension branches are not merged into `master`.
- Releases are managed independently per extension branch.

## Contributing

Contributions are welcome.

- Open an issue first for major changes.
- Submit pull requests to the relevant extension branch.
- Keep changes scoped to one extension branch per pull request.

## Support

- Issues and feature requests: [GitHub Issues](https://github.com/toolbuddy-io/code-extension/issues)

## License

This project is licensed under the [MIT License](LICENSE).
