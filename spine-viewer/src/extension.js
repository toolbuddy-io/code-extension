"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const path = require("node:path");
const vscode = require("vscode");
const { directoryHasSpineFiles, extractSpineBundleFromDirectory } = require("./spine-extraction");

function getNonce() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i += 1) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

function bytesToReadable(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function buildWebviewHtml(webview, extensionUri, bundle) {
  const nonce = getNonce();
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "panel.js"));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "panel.css"));
  const payload = JSON.stringify(bundle).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'nonce-${nonce}' https:; script-src 'nonce-${nonce}' https:; connect-src https:; font-src https: data:;" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ToolBuddy Spine Viewer</title>
    <link nonce="${nonce}" rel="stylesheet" href="${styleUri}" />
  </head>
  <body>
    <div class="layout">
      <header class="topbar">
        <div>
          <h1>ToolBuddy Spine Viewer</h1>
          <p class="subtitle">Enabled: Play Animation + Update Skin</p>
        </div>
        <div class="badge">Spine ${bundle.versionLabel}</div>
      </header>

      <section class="meta">
        <div>Files: <strong>${bundle.fileCount}</strong></div>
        <div>Bundle Size: <strong>${bytesToReadable(bundle.totalBytes)}</strong></div>
        <div>Skeleton: <strong>${bundle.skeletonFileName}</strong></div>
        <div>Atlas: <strong>${bundle.atlasFileName}</strong></div>
      </section>

      <section class="controls">
        <label>
          Animation
          <select id="animationSelect"></select>
        </label>
        <label>
          Skin
          <select id="skinSelect"></select>
        </label>
        <label class="inline">
          <input id="loopToggle" type="checkbox" checked />
          Loop
        </label>
        <button id="playPauseButton" type="button">Pause</button>
      </section>

      <section class="locked">
        <h2>Locked Features</h2>
        <p>Timeline, export, debug overlays, speed controls, and grid/pan are currently locked.</p>
      </section>

      <section class="player-shell">
        <div id="playerRoot" class="player-root"></div>
      </section>

      <section class="status" id="statusText">Loading Spine runtime...</section>
    </div>
    <script nonce="${nonce}">window.__SPINE_BUNDLE__ = ${payload};</script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
}

async function openViewerForFolder(context, folderUri) {
  if (!folderUri) {
    throw new Error("No folder selected.");
  }

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

  const bundle = await extractSpineBundleFromDirectory(folderUri.fsPath);
  const panel = vscode.window.createWebviewPanel(
    "toolbuddySpineViewer",
    `Spine Viewer: ${path.basename(folderUri.fsPath)}`,
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  );
  panel.webview.html = buildWebviewHtml(panel.webview, context.extensionUri, bundle);
}

function activate(context) {
  const disposable = vscode.commands.registerCommand("toolbuddySpineViewer.openFolder", async (resourceUri) => {
    try {
      let folderUri = resourceUri;
      if (!folderUri) {
        const pick = await vscode.window.showOpenDialog({
          canSelectMany: false,
          canSelectFolders: true,
          canSelectFiles: false,
          openLabel: "Select Spine Export Folder",
        });
        if (!pick || !pick.length) {
          return;
        }
        folderUri = pick[0];
      }
      await openViewerForFolder(context, folderUri);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`ToolBuddy Spine Viewer: ${message}`);
    }
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
