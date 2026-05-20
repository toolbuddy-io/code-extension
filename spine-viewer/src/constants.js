"use strict";

const COMMANDS = {
  OPEN_FOLDER: "toolbuddySpineViewer.openFolder",
  RATE_EXTENSION: "toolbuddySpineViewer.rateExtension",
  STAR_ON_GITHUB: "toolbuddySpineViewer.starOnGitHub",
};

const CONTEXT_KEYS = {
  SUPPORTED_FOLDERS: "toolbuddySpineViewer.supportedFolders",
};

const URLS = {
  MARKETPLACE_REVIEW:
    "https://marketplace.visualstudio.com/items?itemName=toolbuddy.toolbuddy-spine-viewer&ssr=false#review-details",
  GITHUB_REPO: "https://github.com/toolbuddy-io/code-extension",
};

const VIEW = {
  TYPE: "toolbuddySpineViewer.panel",
  TITLE: "Spine Animation Player",
};

module.exports = {
  COMMANDS,
  CONTEXT_KEYS,
  URLS,
  VIEW,
};
