"use strict";

const path = require("node:path");
const vscode = require("vscode");
const { DEFAULT_SETTINGS, SCALE_OPTIONS, SIZE_OPTIONS, VIEW } = require("./constants");
const { deleteImages, exportAtlasPackage, generateAtlasPreview, getTextureName } = require("./atlas-service");
const { scanImageFolder } = require("./image-scanner");
const { buildWebviewHtml } = require("./webview-content");

async function resolveFolderUri(resourceUri) {
  if (resourceUri) {
    return resourceUri;
  }

  const picked = await vscode.window.showOpenDialog({
    canSelectMany: false,
    canSelectFiles: false,
    canSelectFolders: true,
    openLabel: "Select Texture Folder",
  });

  if (!picked?.length) {
    return null;
  }

  return picked[0];
}

async function assertDirectory(folderUri) {
  const stat = await vscode.workspace.fs.stat(folderUri);
  if (stat.type !== vscode.FileType.Directory) {
    throw new Error("Selected resource is not a folder.");
  }
}

function enrichImagesForWebview(webview, folderUri, images) {
  return images.map((image) => ({
    relativePath: image.relativePath,
    fileName: image.fileName,
    directory: image.directory,
    bytes: image.bytes,
    previewUrl: webview.asWebviewUri(vscode.Uri.joinPath(folderUri, ...image.relativePath.split("/"))).toString(),
  }));
}

async function buildWorkspaceState(webview, folderUri, folderFsPath) {
  const scanResult = await scanImageFolder(folderFsPath);
  return {
    folderName: path.basename(folderFsPath),
    folderPath: folderFsPath,
    imageCount: scanResult.images.length,
    images: enrichImagesForWebview(webview, folderUri, scanResult.images),
    manifest: scanResult.manifest,
    defaultTextureName: getTextureName(folderFsPath),
    settings: {
      ...DEFAULT_SETTINGS,
    },
    scaleOptions: SCALE_OPTIONS,
    sizeOptions: SIZE_OPTIONS,
  };
}

function toSelectedImages(workspaceState, selectedPaths) {
  const selectedPathSet = new Set((selectedPaths || []).map(String));
  return workspaceState.images.filter((image) => selectedPathSet.has(image.relativePath));
}

function getErrorMessage(error) {
  if (error instanceof Error && typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === "object") {
    if (typeof error.description === "string" && error.description.trim()) {
      return error.description;
    }
    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown error";
    }
  }

  return String(error || "Unknown error");
}

async function openTexturePacker(context, resourceUri) {
  const folderUri = await resolveFolderUri(resourceUri);
  if (!folderUri) {
    return;
  }

  await assertDirectory(folderUri);
  const folderFsPath = folderUri.fsPath;

  const panel = vscode.window.createWebviewPanel(
    VIEW.TYPE,
    `${VIEW.TITLE}: ${path.basename(folderFsPath)}`,
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [context.extensionUri, folderUri],
    },
  );

  let workspaceState = await buildWorkspaceState(panel.webview, folderUri, folderFsPath);
  if (!workspaceState.images.length) {
    throw new Error("No nested image files found. Add .png, .jpg, .jpeg, or .webp files.");
  }

  panel.webview.html = buildWebviewHtml(panel.webview, context.extensionUri, workspaceState);

  panel.webview.onDidReceiveMessage(async (message) => {
    try {
      switch (message?.type) {
        case "requestPreview": {
          const selectedImages = toSelectedImages(workspaceState, message.selectedPaths);
          if (!selectedImages.length) {
            panel.webview.postMessage({
              type: "previewUpdated",
              requestId: message.requestId,
              preview: {
                pages: [],
                outputFiles: [],
              },
            });
            return;
          }

          const preview = await generateAtlasPreview(
            folderFsPath,
            selectedImages,
            message.settings,
            getTextureName(folderFsPath, message.textureName),
          );
          panel.webview.postMessage({
            type: "previewUpdated",
            requestId: message.requestId,
            preview,
          });
          return;
        }

        case "deleteSelectedFiles": {
          const selectedPaths = (message.selectedPaths || []).filter(Boolean);
          if (!selectedPaths.length) {
            return;
          }

          const decision = await vscode.window.showWarningMessage(
            `Delete ${selectedPaths.length} selected sprite file(s)?`,
            { modal: true },
            "Delete",
          );
          if (decision !== "Delete") {
            return;
          }

          await deleteImages(folderFsPath, selectedPaths);
          workspaceState = await buildWorkspaceState(panel.webview, folderUri, folderFsPath);
          panel.webview.postMessage({
            type: "workspaceUpdated",
            workspace: workspaceState,
          });
          return;
        }

        case "exportPackage": {
          const selectedImages = toSelectedImages(workspaceState, message.selectedPaths);
          if (!selectedImages.length) {
            throw new Error("Select at least one sprite before exporting.");
          }

          const defaultTextureName = getTextureName(folderFsPath, message.textureName);
          const enteredTextureName = await vscode.window.showInputBox({
            prompt: "Sprite atlas file name",
            value: defaultTextureName,
            placeHolder: defaultTextureName,
            ignoreFocusOut: true,
          });

          const exportResult = await exportAtlasPackage(
            folderFsPath,
            selectedImages,
            message.settings,
            enteredTextureName || defaultTextureName,
          );

          workspaceState = await buildWorkspaceState(panel.webview, folderUri, folderFsPath);
          panel.webview.postMessage({
            type: "exportCompleted",
            workspace: workspaceState,
            exportResult,
          });

          void vscode.window.showInformationMessage(
            `Texture atlas exported as ${exportResult.textureName}.`,
          );
          return;
        }

        default:
          return;
      }
    } catch (error) {
      panel.webview.postMessage({
        type: "error",
        message: getErrorMessage(error),
      });
    }
  });
}

module.exports = {
  openTexturePacker,
};
