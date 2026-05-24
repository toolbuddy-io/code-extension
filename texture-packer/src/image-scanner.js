"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const {
  IMAGE_EXTENSIONS,
  MANIFEST_FILE_NAME,
  SKIP_DIRECTORY_NAMES,
} = require("./constants");

function normalizeRelativePath(input) {
  return String(input || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readManifest(folderFsPath) {
  const manifestPath = path.join(folderFsPath, MANIFEST_FILE_NAME);
  if (!(await pathExists(manifestPath))) {
    return {
      schemaVersion: 1,
      sourceFolderName: null,
      generatedImagePaths: [],
    };
  }

  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      schemaVersion: 1,
      sourceFolderName: typeof parsed?.sourceFolderName === "string" ? parsed.sourceFolderName : null,
      generatedImagePaths: Array.isArray(parsed?.generatedImagePaths)
        ? parsed.generatedImagePaths.map(normalizeRelativePath).filter(Boolean)
        : [],
    };
  } catch {
    return {
      schemaVersion: 1,
      sourceFolderName: null,
      generatedImagePaths: [],
    };
  }
}

async function writeManifest(folderFsPath, manifest) {
  const manifestPath = path.join(folderFsPath, MANIFEST_FILE_NAME);
  const payload = JSON.stringify(
    {
      schemaVersion: 1,
      sourceFolderName: manifest?.sourceFolderName || null,
      generatedImagePaths: Array.from(
        new Set((manifest?.generatedImagePaths || []).map(normalizeRelativePath).filter(Boolean)),
      ).sort(),
      updatedAt: new Date().toISOString(),
    },
    null,
    2,
  );
  await fs.writeFile(manifestPath, payload, "utf8");
}

async function collectImagesRecursively(folderFsPath, rootFsPath, ignoredGeneratedPaths, entries) {
  const directoryEntries = await fs.readdir(folderFsPath, { withFileTypes: true });

  for (const entry of directoryEntries) {
    if (entry.name === MANIFEST_FILE_NAME) {
      continue;
    }

    const absolutePath = path.join(folderFsPath, entry.name);
    const relativePath = normalizeRelativePath(path.relative(rootFsPath, absolutePath));

    if (entry.isDirectory()) {
      if (SKIP_DIRECTORY_NAMES.has(entry.name)) {
        continue;
      }
      await collectImagesRecursively(absolutePath, rootFsPath, ignoredGeneratedPaths, entries);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(extension)) {
      continue;
    }

    if (ignoredGeneratedPaths.has(relativePath)) {
      continue;
    }

    const stat = await fs.stat(absolutePath);
    entries.push({
      absolutePath,
      relativePath,
      fileName: entry.name,
      directory: normalizeRelativePath(path.dirname(relativePath)).replace(/^\.$/, ""),
      bytes: stat.size,
    });
  }
}

async function scanImageFolder(folderFsPath) {
  const manifest = await readManifest(folderFsPath);
  const ignoredGeneratedPaths = new Set(manifest.generatedImagePaths.map(normalizeRelativePath));
  const images = [];

  await collectImagesRecursively(folderFsPath, folderFsPath, ignoredGeneratedPaths, images);
  images.sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  return {
    manifest,
    images,
  };
}

module.exports = {
  normalizeRelativePath,
  readManifest,
  scanImageFolder,
  writeManifest,
};
