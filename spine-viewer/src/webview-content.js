"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const vscode = require("vscode");

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
  const csp = webview.cspSource;
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "panel.js"));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "panel.css"));
  const payload = JSON.stringify(bundle).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${csp} data: blob:; style-src ${csp} 'nonce-${nonce}'; script-src ${csp} 'nonce-${nonce}'; connect-src ${csp} data: blob:; font-src ${csp} data:;" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Spine Animation Player</title>
    <link nonce="${nonce}" rel="stylesheet" href="${styleUri}" />
  </head>
  <body>
    <div class="layout">
      <header class="topbar">
        <div>
          <h1>Spine Animation Player</h1>
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
        <label class="animation-field">
          Animation
          <select id="animationSelect"></select>
        </label>
        <label class="skin-field">
          Skin
          <select id="skinSelect"></select>
        </label>
        <label class="inline loop-field">
          <input id="loopToggle" type="checkbox" checked />
          Loop
        </label>
        <button id="playPauseButton" type="button">Pause</button>
      </section>

      <section class="player-shell">
        <div id="playerRoot" class="player-root"></div>
      </section>

      <section class="status" id="statusText"></section>
    </div>
    <script nonce="${nonce}">window.__SPINE_BUNDLE__ = ${payload};</script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
}

module.exports = {
  buildWebviewHtml,
};
