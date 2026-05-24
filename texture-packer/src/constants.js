"use strict";

const COMMANDS = {
  OPEN_FOLDER: "toolbuddyTexturePacker.openFolder",
};

const VIEW = {
  TYPE: "toolbuddyTexturePacker.panel",
  TITLE: "Texture Packer",
};

const MANIFEST_FILE_NAME = ".toolbuddy-texture-packer.json";
const SOURCE_FOLDER_NAME = "sprites";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const SKIP_DIRECTORY_NAMES = new Set([".git", ".vscode", "node_modules"]);

const OUTPUT_EXPORTERS = {
  cocos: "Cocos2d",
  unity: "Unity3D",
  phaser: "Phaser3",
  css: "Css",
  json: "JsonHash",
};

const DEFAULT_SETTINGS = {
  width: 2048,
  height: 2048,
  fixedSize: false,
  powerOfTwo: false,
  scale: 1,
  padding: 2,
  extrude: 0,
  alphaThreshold: 0,
  allowRotation: true,
  detectIdentical: false,
  allowTrim: true,
  removeFileExtension: false,
  prependFolderName: true,
  outputFormat: "unity",
  moveSpritesIntoFolder: false,
};

const SCALE_OPTIONS = [0.25, 0.5, 0.75, 1, 1.5, 2.0];
const SIZE_OPTIONS = [512, 1024, 2048, 4096];

module.exports = {
  COMMANDS,
  DEFAULT_SETTINGS,
  IMAGE_EXTENSIONS,
  MANIFEST_FILE_NAME,
  OUTPUT_EXPORTERS,
  SCALE_OPTIONS,
  SIZE_OPTIONS,
  SKIP_DIRECTORY_NAMES,
  SOURCE_FOLDER_NAME,
  VIEW,
};
