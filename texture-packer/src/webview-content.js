"use strict";

const vscode = require("vscode");

function getNonce() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let index = 0; index < 32; index += 1) {
    nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return nonce;
}

function buildOptionMarkup(values) {
  return values
    .map((value) => `<option value="${value}">${value}</option>`)
    .join("");
}

function buildWebviewHtml(webview, extensionUri, state) {
  const nonce = getNonce();
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "panel.js"));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "panel.css"));
  const payload = JSON.stringify(state).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${webview.cspSource} data: blob:; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src ${webview.cspSource} 'nonce-${nonce}';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Texture Packer</title>
    <link nonce="${nonce}" rel="stylesheet" href="${styleUri}" />
  </head>
  <body>
    <div class="app-shell">
      <header class="topbar">
        <div class="topbar-title-row">
          <h1>Texture Packer</h1>
          <div class="header-stats-row">
            <div class="header-stat">
              <span class="header-detail-label">Source Folder</span>
              <strong id="summaryFolder">${state.folderPath}</strong>
            </div>
            <div class="header-stat header-stat-total">
              <span class="header-detail-label">Total Image</span>
              <strong id="summaryImages">${state.imageCount}</strong>
            </div>
          </div>
        </div>
        <div class="topbar-subtitle-row">
          <p class="topbar-subtitle">Scan nested images, control packing, and export atlas packages without leaving VS Code.</p>
        </div>
      </header>

      <section class="workspace-grid" id="workspaceGrid">
        <aside class="sidebar left-panel">
          <div class="panel-header">
            <div>
              <h2>Sprites</h2>
            </div>
          </div>
          <div id="fileList" class="file-list"></div>
        </aside>

        <main class="center-panel">
          <div class="preview-toolbar">
            <div class="preview-toolbar-primary">
              <div class="preview-toolbar-left">
                <div class="preview-kicker-row">
                  <span class="preview-kicker">Atlas Preview</span>
                  <span class="preview-size-text"><strong id="atlasDimensionBadge" class="preview-size-value">--×--</strong></span>
                </div>
              </div>
              <div class="preview-toolbar-right">
                <label class="preview-chip preview-chip-check">
                  <input id="outlineToggle" type="checkbox" checked />
                  Display outlines
                </label>
                <div class="zoom-control">
                  <button id="zoomOutButton" type="button" class="zoom-button" aria-label="Zoom out">−</button>
                  <span id="zoomLabel" class="zoom-label">50%</span>
                  <button id="zoomInButton" type="button" class="zoom-button" aria-label="Zoom in">+</button>
                </div>
              </div>
            </div>
            <div id="atlasPagesRow" class="atlas-pages-row"></div>
          </div>

          <div id="previewContent" class="preview-content"></div>
          <div id="statusText" class="status-text"></div>
        </main>

        <aside class="sidebar right-panel" id="rightPanel">
          <div class="settings-head">
            <div>
              <h2>Settings</h2>
              <p>Configure packing, atlas bounds, and exporter output.</p>
            </div>
          </div>

          <div class="controls-content" id="controlsContent">
            <section class="accordion-group" data-accordion-item>
              <button type="button" class="accordion-trigger" data-accordion-trigger aria-expanded="true">
                <span>Layout</span>
                <span class="accordion-icon">›</span>
              </button>
              <div class="accordion-body" data-accordion-body>
                <label>
                  Size
                  <select id="sizeSelect">${buildOptionMarkup(state.sizeOptions)}</select>
                </label>
                <label>
                  Size Constraints
                  <select id="sizeConstraintSelect">
                    <option value="any">Any size</option>
                    <option value="pot">Power of two</option>
                    <option value="square">Square</option>
                    <option value="pot-square">Power-of-two square</option>
                  </select>
                </label>
                <label>
                  Scale
                  <select id="scaleSelect">${buildOptionMarkup(state.scaleOptions)}</select>
                </label>
                <div class="checkbox-grid">
                  <label class="checkbox-row">
                    <input id="allowRotationToggle" type="checkbox" />
                    Rotate Sprites
                  </label>
                  <label class="checkbox-row">
                    <input id="detectIdenticalToggle" type="checkbox" />
                    Detect Identical Sprites
                  </label>
                </div>
              </div>
            </section>

            <section class="accordion-group" data-accordion-item>
              <button type="button" class="accordion-trigger" data-accordion-trigger aria-expanded="false">
                <span>Sprites</span>
                <span class="accordion-icon">›</span>
              </button>
              <div class="accordion-body" data-accordion-body hidden>
                <div class="field-grid two-up">
                  <label>
                    Padding
                    <input id="paddingInput" type="number" min="0" step="1" value="2" />
                  </label>
                  <label>
                    Extrude
                    <input id="extrudeInput" type="number" min="0" step="1" value="0" />
                  </label>
                </div>
                <label>
                  Alpha Threshold
                  <input id="alphaThresholdInput" type="number" min="0" step="1" value="0" />
                </label>
                <div class="checkbox-grid">
                  <label class="checkbox-row">
                    <input id="allowTrimToggle" type="checkbox" />
                    Allow Trim
                  </label>
                  <label class="checkbox-row">
                    <input id="removeExtensionToggle" type="checkbox" />
                    Remove File Extension
                  </label>
                  <label class="checkbox-row">
                    <input id="prependFolderToggle" type="checkbox" />
                    Prepend Folder Name
                  </label>
                </div>
                <div class="static-row">
                  <span>Trim Mode</span>
                  <strong>Default</strong>
                </div>
              </div>
            </section>

            <section class="accordion-group" data-accordion-item>
              <button type="button" class="accordion-trigger" data-accordion-trigger aria-expanded="false">
                <span>Output</span>
                <span class="accordion-icon">›</span>
              </button>
              <div class="accordion-body" data-accordion-body hidden>
                <label>
                  Engine
                  <select id="outputFormatSelect">
                    <option value="cocos">Cocos</option>
                    <option value="unity">Unity</option>
                    <option value="phaser">Phaser</option>
                    <option value="css">CSS</option>
                    <option value="json">Json</option>
                  </select>
                </label>
                <label class="checkbox-row">
                  <input id="moveSpritesToggle" type="checkbox" />
                  Move Sprites Into Folder
                </label>
              </div>
            </section>
          </div>
          <div class="right-panel-footer">
            <button id="downloadButton" type="button" class="accent-button download-button">Download</button>
          </div>
        </aside>
      </section>
    </div>
    <script nonce="${nonce}">window.__TEXTURE_PACKER_STATE__ = ${payload};</script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
}

module.exports = {
  buildWebviewHtml,
};
