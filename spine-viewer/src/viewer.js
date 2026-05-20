"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const path = require("node:path");
const vscode = require("vscode");
const { buildWebviewHtml } = require("./webview-content");
const { directoryHasSpineFiles, extractSpineBundleFromDirectory } = require("./spine-extraction");
const { VIEW } = require("./constants");
const { resolveRuntimeAsset } = require("./runtime-map");

async function resolveFolderUri(resourceUri) {
  if (resourceUri) {
    return resourceUri;
  }
  const pick = await vscode.window.showOpenDialog({
    canSelectMany: false,
    canSelectFolders: true,
    canSelectFiles: false,
    openLabel: "Select Spine Export Folder",
  });
  if (!pick || !pick.length) {
    return null;
  }
  return pick[0];
}

async function assertFolderHasSpineBundle(folderUri) {
  const stat = await vscode.workspace.fs.stat(folderUri);
  if (stat.type !== vscode.FileType.Directory) {
    throw new Error("Selected resource is not a folder.");
  }

  const spinePresence = await directoryHasSpineFiles(folderUri.fsPath);
  if (!spinePresence.hasAnySpineFile) {
    throw new Error("No Spine files found in this folder. Add .json, .atlas, and atlas image files.");
  }
  if (!spinePresence.hasCoreBundleFiles) {
    throw new Error("Incomplete Spine bundle. This folder must include .json, .atlas, and atlas page images.");
  }
}

function toPathSegments(relativePath) {
  return String(relativePath || "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

function resolveRuntimeWebviewAsset(webview, extensionUri, runtimeSeries) {
  const runtimeAsset = resolveRuntimeAsset(runtimeSeries);
  if (!runtimeAsset || !runtimeAsset.stylePath || !runtimeAsset.scriptPath) {
    return null;
  }
  const styleUri = vscode.Uri.joinPath(extensionUri, ...toPathSegments(runtimeAsset.stylePath));
  const scriptUri = vscode.Uri.joinPath(extensionUri, ...toPathSegments(runtimeAsset.scriptPath));
  return {
    style: webview.asWebviewUri(styleUri).toString(),
    script: webview.asWebviewUri(scriptUri).toString(),
  };
}

async function openSpineViewer(context, resourceUri) {
  const folderUri = await resolveFolderUri(resourceUri);
  if (!folderUri) {
    return;
  }

  await assertFolderHasSpineBundle(folderUri);
  const bundle = await extractSpineBundleFromDirectory(folderUri.fsPath);

  const panel = vscode.window.createWebviewPanel(
    VIEW.TYPE,
    `${VIEW.TITLE}: ${path.basename(folderUri.fsPath)}`,
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [context.extensionUri, folderUri],
    },
  );

  const skeletonUri = vscode.Uri.joinPath(folderUri, ...toPathSegments(bundle.skeletonRelativePath));
  const atlasUri = vscode.Uri.joinPath(folderUri, ...toPathSegments(bundle.atlasRelativePath));

  const webviewBundle = {
    schemaVersion: 2,
    ...bundle,
    runtimeAsset: resolveRuntimeWebviewAsset(panel.webview, context.extensionUri, bundle.runtimeSeries),
    skeletonUrl: panel.webview.asWebviewUri(skeletonUri).toString(),
    atlasUrl: panel.webview.asWebviewUri(atlasUri).toString(),
  };

  panel.webview.html = buildWebviewHtml(panel.webview, context.extensionUri, webviewBundle);
}

module.exports = {
  openSpineViewer,
};
