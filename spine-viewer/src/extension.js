"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const path = require("node:path");
const vscode = require("vscode");
const { COMMANDS, CONTEXT_KEYS } = require("./constants");
const { openSpineViewer } = require("./viewer");

const SPINE_IMAGE_GLOBS = ["**/*.png", "**/*.jpg", "**/*.jpeg", "**/*.webp", "**/*.avif"];
const SPINE_CONTEXT_REFRESH_DELAY_MS = 200;

function toFolderKey(fileUri) {
  return vscode.Uri.file(path.dirname(fileUri.fsPath)).path;
}

function toFolderFsPath(fileUri) {
  return path.dirname(fileUri.fsPath);
}

async function findSpineFolderContextMap() {
  const [
    jsonFiles,
    atlasFiles,
    skelFiles,
    ...imageFileGroups
  ] = await Promise.all([
    vscode.workspace.findFiles("**/*.json"),
    vscode.workspace.findFiles("**/*.atlas"),
    vscode.workspace.findFiles("**/*.skel"),
    ...SPINE_IMAGE_GLOBS.map((glob) => vscode.workspace.findFiles(glob)),
  ]);
  const imageFiles = imageFileGroups.flat();

  /** @type {Map<string, { hasJson: boolean; hasAtlas: boolean; hasSkel: boolean; hasImage: boolean }>} */
  const folderFlags = new Map();
  const touch = (uri, update) => {
    const key = toFolderKey(uri);
    const fallbackKey = toFolderFsPath(uri);
    const current = folderFlags.get(key) || folderFlags.get(fallbackKey) || {
      hasJson: false,
      hasAtlas: false,
      hasSkel: false,
      hasImage: false,
    };
    update(current);
    folderFlags.set(key, current);
    folderFlags.set(fallbackKey, current);
  };

  for (const uri of jsonFiles) {
    touch(uri, (entry) => {
      entry.hasJson = true;
    });
  }
  for (const uri of atlasFiles) {
    touch(uri, (entry) => {
      entry.hasAtlas = true;
    });
  }
  for (const uri of skelFiles) {
    touch(uri, (entry) => {
      entry.hasSkel = true;
    });
  }
  for (const uri of imageFiles) {
    touch(uri, (entry) => {
      entry.hasImage = true;
    });
  }

  /** @type {Record<string, boolean>} */
  const supportedFolders = {};
  for (const [folderPath, flags] of folderFlags) {
    if (!flags.hasJson || !flags.hasImage || (!flags.hasAtlas && !flags.hasSkel)) {
      continue;
    }
    supportedFolders[folderPath] = true;
  }
  return supportedFolders;
}

async function refreshSpineFolderContext() {
  try {
    const supportedFolders = await findSpineFolderContextMap();
    await vscode.commands.executeCommand("setContext", CONTEXT_KEYS.SUPPORTED_FOLDERS, supportedFolders);
  } catch {
    await vscode.commands.executeCommand("setContext", CONTEXT_KEYS.SUPPORTED_FOLDERS, {});
  }
}

function activate(context) {
  let refreshTimeout = null;
  const scheduleRefresh = () => {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
    refreshTimeout = setTimeout(() => {
      refreshTimeout = null;
      void refreshSpineFolderContext();
    }, SPINE_CONTEXT_REFRESH_DELAY_MS);
  };

  void refreshSpineFolderContext();

  const watcherPatterns = [
    "**/*.json",
    "**/*.atlas",
    "**/*.skel",
    ...SPINE_IMAGE_GLOBS,
  ];
  const watchers = watcherPatterns.map((pattern) => vscode.workspace.createFileSystemWatcher(pattern));
  for (const watcher of watchers) {
    watcher.onDidCreate(scheduleRefresh);
    watcher.onDidDelete(scheduleRefresh);
    watcher.onDidChange(scheduleRefresh);
  }

  const workspaceFoldersChanged = vscode.workspace.onDidChangeWorkspaceFolders(scheduleRefresh);
  const filesCreated = vscode.workspace.onDidCreateFiles(scheduleRefresh);
  const filesDeleted = vscode.workspace.onDidDeleteFiles(scheduleRefresh);
  const filesRenamed = vscode.workspace.onDidRenameFiles(scheduleRefresh);

  const openFolderCommand = vscode.commands.registerCommand(COMMANDS.OPEN_FOLDER, async (resourceUri) => {
    try {
      await openSpineViewer(context, resourceUri);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Spine Animation Player: ${message}`);
    }
  });

  context.subscriptions.push(
    openFolderCommand,
    ...watchers,
    workspaceFoldersChanged,
    filesCreated,
    filesDeleted,
    filesRenamed,
    {
      dispose() {
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
          refreshTimeout = null;
        }
      },
    },
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
