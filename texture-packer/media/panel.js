"use strict";

(function bootstrap() {
  const vscode = acquireVsCodeApi();
  const initialState = window.__TEXTURE_PACKER_STATE__;

  const fileList = document.getElementById("fileList");
  const previewContent = document.getElementById("previewContent");
  const atlasPagesRow = document.getElementById("atlasPagesRow");
  const atlasDimensionBadge = document.getElementById("atlasDimensionBadge");
  const statusText = document.getElementById("statusText");
  const summaryImages = document.getElementById("summaryImages");
  const summaryFolder = document.getElementById("summaryFolder");
  const zoomOutButton = document.getElementById("zoomOutButton");
  const zoomInButton = document.getElementById("zoomInButton");
  const zoomLabel = document.getElementById("zoomLabel");
  const outlineToggle = document.getElementById("outlineToggle");
  const downloadButton = document.getElementById("downloadButton");

  const controls = {
    size: document.getElementById("sizeSelect"),
    sizeConstraint: document.getElementById("sizeConstraintSelect"),
    scale: document.getElementById("scaleSelect"),
    padding: document.getElementById("paddingInput"),
    extrude: document.getElementById("extrudeInput"),
    alphaThreshold: document.getElementById("alphaThresholdInput"),
    allowRotation: document.getElementById("allowRotationToggle"),
    detectIdentical: document.getElementById("detectIdenticalToggle"),
    allowTrim: document.getElementById("allowTrimToggle"),
    removeFileExtension: document.getElementById("removeExtensionToggle"),
    prependFolderName: document.getElementById("prependFolderToggle"),
    outputFormat: document.getElementById("outputFormatSelect"),
    moveSpritesIntoFolder: document.getElementById("moveSpritesToggle"),
  };

  const zoomLevels = [25, 50, 75, 100, 150, 200];
  const state = {
    workspace: initialState,
    preview: {
      pages: [],
      outputFiles: [],
    },
    selectedPaths: new Set((initialState.images || []).map((image) => image.relativePath)),
    previewRequestId: 0,
    lastAppliedPreviewRequestId: 0,
    zoomIndex: 3,
    showOutlines: true,
    firstAtlasDimension: null,
    activeAtlasPageIndex: 0,
    hiddenPaths: new Set(),
  };

  const imageDimensionByPath = new Map();
  const pendingImageDimensionPaths = new Set();
  let fileListRefreshTimer = null;
  let previewTimer = null;

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 B";
    }
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
  }

  function getSelectedImages() {
    return getVisibleImages().filter((image) => state.selectedPaths.has(image.relativePath));
  }

  function getVisibleImages() {
    return (state.workspace.images || []).filter((image) => !state.hiddenPaths.has(image.relativePath));
  }

  function setStatus(message, isError) {
    if (!statusText) {
      return;
    }
    const text =
      typeof message === "string"
        ? message
        : message && typeof message === "object"
          ? JSON.stringify(message)
          : String(message || "");
    if (isError) {
      statusText.textContent = text || "Unknown error";
      statusText.classList.add("is-error");
      return;
    }
    statusText.textContent = "";
    statusText.classList.remove("is-error");
  }

  function queueFileListRefresh() {
    if (fileListRefreshTimer) {
      return;
    }
    fileListRefreshTimer = setTimeout(() => {
      fileListRefreshTimer = null;
      renderFileList();
    }, 0);
  }

  function ensureImageDimensions(image) {
    const key = image.relativePath;
    if (imageDimensionByPath.has(key) || pendingImageDimensionPaths.has(key)) {
      return;
    }

    pendingImageDimensionPaths.add(key);
    const probe = new Image();
    probe.onload = () => {
      pendingImageDimensionPaths.delete(key);
      imageDimensionByPath.set(key, {
        width: probe.naturalWidth,
        height: probe.naturalHeight,
      });
      queueFileListRefresh();
    };
    probe.onerror = () => {
      pendingImageDimensionPaths.delete(key);
      imageDimensionByPath.set(key, null);
      queueFileListRefresh();
    };
    probe.src = image.previewUrl;
  }

  function readSettings() {
    const size = Number(controls.size.value);
    const sizeConstraint = controls.sizeConstraint.value;

    const fixedSize = sizeConstraint === "square" || sizeConstraint === "pot-square";
    const powerOfTwo = sizeConstraint === "pot" || sizeConstraint === "pot-square";

    return {
      width: size,
      height: size,
      fixedSize,
      powerOfTwo,
      scale: Number(controls.scale.value),
      padding: Number(controls.padding.value),
      extrude: Number(controls.extrude.value),
      alphaThreshold: Number(controls.alphaThreshold.value),
      allowRotation: controls.allowRotation.checked,
      detectIdentical: controls.detectIdentical.checked,
      allowTrim: controls.allowTrim.checked,
      removeFileExtension: controls.removeFileExtension.checked,
      prependFolderName: controls.prependFolderName.checked,
      outputFormat: controls.outputFormat.value,
      moveSpritesIntoFolder: controls.moveSpritesIntoFolder.checked,
    };
  }

  function applyDefaultSettings() {
    const settings = state.workspace.settings || {};
    controls.size.value = String(settings.width || settings.height || 2048);
    if (settings.fixedSize && settings.powerOfTwo) {
      controls.sizeConstraint.value = "pot-square";
    } else if (settings.fixedSize) {
      controls.sizeConstraint.value = "square";
    } else if (settings.powerOfTwo) {
      controls.sizeConstraint.value = "pot";
    } else {
      controls.sizeConstraint.value = "any";
    }
    controls.scale.value = String(settings.scale);
    controls.padding.value = String(settings.padding);
    controls.extrude.value = String(settings.extrude);
    controls.alphaThreshold.value = String(settings.alphaThreshold);
    controls.allowRotation.checked = Boolean(settings.allowRotation);
    controls.detectIdentical.checked = Boolean(settings.detectIdentical);
    controls.allowTrim.checked = Boolean(settings.allowTrim);
    controls.removeFileExtension.checked = Boolean(settings.removeFileExtension);
    controls.prependFolderName.checked = Boolean(settings.prependFolderName);
    controls.outputFormat.value = settings.outputFormat || "json";
    controls.moveSpritesIntoFolder.checked = Boolean(settings.moveSpritesIntoFolder);
  }

  function renderFileList() {
    const images = getVisibleImages();
    fileList.innerHTML = "";
    if (!images.length) {
      fileList.innerHTML = `<div class="empty-state">No source images remain in this folder.</div>`;
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const [index, image] of images.entries()) {
      ensureImageDimensions(image);
      const dimension = imageDimensionByPath.get(image.relativePath);
      const dimensionLabel = dimension ? `${dimension.width}×${dimension.height}` : "--×--";
      const atlasTag = `A${index + 1}`;

      const row = document.createElement("div");
      row.className = `file-row${state.selectedPaths.has(image.relativePath) ? " is-selected" : ""}`;
      row.innerHTML = `
        <button type="button" class="file-row-main" data-path="${image.relativePath}" title="${image.relativePath}">
          <span class="file-name">${image.fileName}</span>
        </button>
        <span class="file-dimension">${dimensionLabel}</span>
        <span class="file-atlas-tag">${atlasTag}</span>
        <button
          type="button"
          class="file-remove-button"
          data-remove-path="${image.relativePath}"
          aria-label="Exclude ${image.fileName} from atlas"
          title="Exclude ${image.fileName} from atlas"
        >
          ×
        </button>
      `;

      const mainButton = row.querySelector(".file-row-main");
      const removeButton = row.querySelector(".file-remove-button");

      mainButton.addEventListener("click", () => {
        if (state.selectedPaths.has(image.relativePath)) {
          state.selectedPaths.delete(image.relativePath);
        } else {
          state.selectedPaths.add(image.relativePath);
        }
        renderSummary();
        renderFileList();
        schedulePreview();
      });

      removeButton.addEventListener("click", () => {
        state.hiddenPaths.add(image.relativePath);
        state.selectedPaths.delete(image.relativePath);
        renderSummary();
        renderFileList();
        schedulePreview();
      });

      fragment.appendChild(row);
    }

    fileList.appendChild(fragment);
  }

  function renderSummary() {
    summaryFolder.textContent = state.workspace.folderPath;
    summaryImages.textContent = String((state.workspace.images || []).length);
  }

  function setAtlasDimension(width, height) {
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      state.firstAtlasDimension = { width, height };
      atlasDimensionBadge.textContent = `${width}×${height}`;
      return;
    }
    state.firstAtlasDimension = null;
    atlasDimensionBadge.textContent = "--×--";
  }

  function applyZoom() {
    const zoom = zoomLevels[state.zoomIndex];
    zoomLabel.textContent = `${zoom}%`;
    previewContent.style.setProperty("--preview-zoom", String(zoom / 100));
    zoomOutButton.disabled = state.zoomIndex === 0;
    zoomInButton.disabled = state.zoomIndex === zoomLevels.length - 1;
  }

  function applyOutlineVisibility() {
    previewContent.classList.toggle("hide-outlines", !state.showOutlines);
  }

  function renderAtlasPreview() {
    const pages = state.preview.pages || [];

    if (!pages.length) {
      atlasPagesRow.innerHTML = "";
      state.activeAtlasPageIndex = 0;
      setAtlasDimension(null, null);
      previewContent.innerHTML = `<div class="empty-preview">Select files and adjust controls to generate a preview.</div>`;
      return;
    }

    if (state.activeAtlasPageIndex >= pages.length) {
      state.activeAtlasPageIndex = 0;
    }
    const activePage = pages[state.activeAtlasPageIndex];

    atlasPagesRow.innerHTML = pages
      .map(
        (_, index) => `
          <button
            type="button"
            class="preview-chip atlas-page-button${index === state.activeAtlasPageIndex ? " active" : ""}"
            data-atlas-page-index="${index}"
          >
            Atlas ${index + 1}
          </button>
        `,
      )
      .join("");

    for (const pageButton of atlasPagesRow.querySelectorAll("[data-atlas-page-index]")) {
      pageButton.addEventListener("click", () => {
        const nextIndex = Number(pageButton.getAttribute("data-atlas-page-index"));
        if (!Number.isFinite(nextIndex) || nextIndex === state.activeAtlasPageIndex) {
          return;
        }
        state.activeAtlasPageIndex = nextIndex;
        renderAtlasPreview();
      });
    }

    previewContent.innerHTML = `
      <article class="atlas-card">
        <img src="${activePage.dataUrl}" alt="Atlas ${state.activeAtlasPageIndex + 1}" loading="lazy" />
      </article>
    `;

    const firstImage = previewContent.querySelector(".atlas-card img");
    if (firstImage) {
      const syncDimension = () => {
        setAtlasDimension(firstImage.naturalWidth, firstImage.naturalHeight);
      };
      if (firstImage.complete && firstImage.naturalWidth > 0) {
        syncDimension();
      } else {
        firstImage.addEventListener("load", syncDimension, { once: true });
        firstImage.addEventListener("error", () => setAtlasDimension(null, null), { once: true });
      }
    } else {
      setAtlasDimension(null, null);
    }
  }

  function schedulePreview() {
    if (previewTimer) {
      clearTimeout(previewTimer);
    }

    previewTimer = setTimeout(() => {
      previewTimer = null;
      const requestId = state.previewRequestId + 1;
      state.previewRequestId = requestId;
      vscode.postMessage({
        type: "requestPreview",
        requestId,
        textureName: state.workspace.defaultTextureName,
        settings: readSettings(),
        selectedPaths: Array.from(state.selectedPaths),
      });
    }, 220);
  }

  function replaceWorkspace(nextWorkspace) {
    const previousSelected = new Set(state.selectedPaths);
    state.workspace = nextWorkspace;
    const workspacePaths = new Set((nextWorkspace.images || []).map((image) => image.relativePath));
    state.hiddenPaths = new Set(
      Array.from(state.hiddenPaths).filter((relativePath) => workspacePaths.has(relativePath)),
    );
    state.selectedPaths = new Set(
      (nextWorkspace.images || [])
        .map((image) => image.relativePath)
        .filter((relativePath) => previousSelected.has(relativePath) && !state.hiddenPaths.has(relativePath)),
    );

    if (!state.selectedPaths.size) {
      state.selectedPaths = new Set(
        (nextWorkspace.images || [])
          .map((image) => image.relativePath)
          .filter((relativePath) => !state.hiddenPaths.has(relativePath)),
      );
    }

    renderSummary();
    renderFileList();
    schedulePreview();
  }

  function attachAccordionHandlers() {
    const items = Array.from(document.querySelectorAll("[data-accordion-item]"));
    if (!items.length) {
      return;
    }

    const setExpanded = (item, expanded) => {
      const itemTrigger = item.querySelector("[data-accordion-trigger]");
      const itemBody = item.querySelector("[data-accordion-body]");
      if (!itemTrigger || !itemBody) {
        return;
      }
      itemTrigger.setAttribute("aria-expanded", expanded ? "true" : "false");
      itemBody.hidden = !expanded;
      item.classList.toggle("is-expanded", expanded);
    };

    // Respect initial HTML state, but normalize retained webview state.
    items.forEach((item) => {
      const trigger = item.querySelector("[data-accordion-trigger]");
      const expanded = trigger?.getAttribute("aria-expanded") === "true";
      setExpanded(item, expanded);
    });

    const triggers = Array.from(document.querySelectorAll("[data-accordion-trigger]"));
    for (const trigger of triggers) {
      trigger.addEventListener("click", () => {
        const group = trigger.closest("[data-accordion-item]");
        if (!group) {
          return;
        }
        const isExpanded = trigger.getAttribute("aria-expanded") === "true";
        const nextExpanded = !isExpanded;
        setExpanded(group, nextExpanded);
      });
    }
  }

  downloadButton.addEventListener("click", () => {
    vscode.postMessage({
      type: "exportPackage",
      textureName: state.workspace.defaultTextureName,
      settings: readSettings(),
      selectedPaths: Array.from(state.selectedPaths),
    });
  });

  zoomOutButton.addEventListener("click", () => {
    if (state.zoomIndex === 0) {
      return;
    }
    state.zoomIndex -= 1;
    applyZoom();
  });

  zoomInButton.addEventListener("click", () => {
    if (state.zoomIndex === zoomLevels.length - 1) {
      return;
    }
    state.zoomIndex += 1;
    applyZoom();
  });

  outlineToggle.addEventListener("change", () => {
    state.showOutlines = outlineToggle.checked;
    applyOutlineVisibility();
  });

  Object.values(controls).forEach((control) => {
    control.addEventListener("change", () => {
      schedulePreview();
    });
  });

  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message?.type) {
      case "previewUpdated":
        if (message.requestId < state.lastAppliedPreviewRequestId) {
          return;
        }
        state.lastAppliedPreviewRequestId = message.requestId;
        state.preview = message.preview || { pages: [], outputFiles: [] };
        renderAtlasPreview();
        setStatus("", false);
        return;

      case "workspaceUpdated":
        replaceWorkspace(message.workspace);
        setStatus("", false);
        return;

      case "exportCompleted":
        state.preview = message.exportResult || { pages: [], outputFiles: [] };
        replaceWorkspace(message.workspace);
        renderAtlasPreview();
        setStatus("", false);
        return;

      case "error":
        setStatus(message.message || "Unknown error", true);
        return;

      default:
        return;
    }
  });

  applyDefaultSettings();
  attachAccordionHandlers();
  renderSummary();
  renderFileList();
  applyZoom();
  applyOutlineVisibility();
  renderAtlasPreview();
  schedulePreview();
})();
