"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { packAsync } = require("free-tex-packer-core");
const sharp = require("sharp");
const {
  DEFAULT_SETTINGS,
  OUTPUT_EXPORTERS,
  SOURCE_FOLDER_NAME,
} = require("./constants");
const {
  normalizeRelativePath,
  readManifest,
  writeManifest,
} = require("./image-scanner");

function ensureArray(input) {
  return Array.isArray(input) ? input : [];
}

const PACKER_INPUT_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function getTextureName(folderFsPath, providedName) {
  const fallback = path.basename(folderFsPath) || "spritesheet";
  const normalized = String(providedName || "").trim();
  return normalized || fallback;
}

function buildAtlasOptions(settings, textureName) {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
  };
  const outputFormat = merged.outputFormat || DEFAULT_SETTINGS.outputFormat;
  const rotationEnabled = Boolean(merged.allowRotation) && outputFormat !== "css";

  return {
    textureName,
    width: Number(merged.width) || DEFAULT_SETTINGS.width,
    height: Number(merged.height) || DEFAULT_SETTINGS.height,
    fixedSize: Boolean(merged.fixedSize),
    powerOfTwo: Boolean(merged.powerOfTwo),
    padding: Number(merged.padding) || 0,
    extrude: Number(merged.extrude) || 0,
    alphaThreshold: Number(merged.alphaThreshold) || 0,
    allowRotation: rotationEnabled,
    detectIdentical: Boolean(merged.detectIdentical),
    allowTrim: Boolean(merged.allowTrim),
    trimMode: "trim",
    removeFileExtension: Boolean(merged.removeFileExtension),
    prependFolderName: Boolean(merged.prependFolderName),
    scale: Number(merged.scale) || DEFAULT_SETTINGS.scale,
    scaleMethod: "BILINEAR",
    packer: "OptimalPacker",
    exporter: OUTPUT_EXPORTERS[outputFormat] || OUTPUT_EXPORTERS.json,
    appInfo: {
      displayName: "ToolBuddy Texture Packer",
      version: "0.1.8",
      url: "https://github.com/toolbuddy-io/code-extension",
    },
  };
}

async function createImagePayloads(folderFsPath, images) {
  const payloads = [];
  const unsupportedExtensions = new Set();

  for (const image of ensureArray(images)) {
    const relativePath = normalizeRelativePath(image.relativePath);
    const extension = path.extname(relativePath).toLowerCase();
    if (!PACKER_INPUT_EXTENSIONS.has(extension)) {
      unsupportedExtensions.add(extension || "(no extension)");
      continue;
    }

    const absolutePath = path.join(folderFsPath, relativePath);
    let contents = await fs.readFile(absolutePath);
    let payloadPath = relativePath;

    if (extension === ".webp") {
      try {
        contents = await sharp(contents).png().toBuffer();
        payloadPath = relativePath.replace(/\.webp$/i, ".png");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Unable to decode WebP sprite: ${image.fileName}. ${message}`);
      }
    }

    const metadata = await sharp(contents).metadata();
    const width = Number(metadata.width) || 0;
    const height = Number(metadata.height) || 0;
    if (width < 1 || height < 1) {
      throw new Error(`Unable to read image dimensions: ${image.fileName}`);
    }

    payloads.push({
      path: payloadPath,
      contents,
      width,
      height,
      relativePath,
    });
  }
  if (unsupportedExtensions.size > 0) {
    throw new Error(
      `Unsupported sprite format: ${Array.from(unsupportedExtensions).join(", ")}. Use PNG, JPG/JPEG, or WEBP files.`,
    );
  }

  if (!payloads.length) {
    throw new Error("No supported sprite files selected. Use PNG, JPG/JPEG, or WEBP files.");
  }

  return payloads;
}

function buildOrderVariants(payloads) {
  const indexed = payloads.map((payload, index) => ({ payload, index }));
  const variants = [
    {
      name: "input",
      sort: (left, right) => left.index - right.index,
    },
    {
      name: "area-desc",
      sort: (left, right) =>
        right.payload.width * right.payload.height - left.payload.width * left.payload.height
        || Math.max(right.payload.width, right.payload.height) - Math.max(left.payload.width, left.payload.height)
        || right.index - left.index,
    },
    {
      name: "max-side-desc",
      sort: (left, right) =>
        Math.max(right.payload.width, right.payload.height) - Math.max(left.payload.width, left.payload.height)
        || right.payload.width * right.payload.height - left.payload.width * left.payload.height
        || right.index - left.index,
    },
    {
      name: "height-desc",
      sort: (left, right) =>
        right.payload.height - left.payload.height
        || right.payload.width - left.payload.width
        || right.payload.width * right.payload.height - left.payload.width * left.payload.height
        || right.index - left.index,
    },
    {
      name: "width-desc",
      sort: (left, right) =>
        right.payload.width - left.payload.width
        || right.payload.height - left.payload.height
        || right.payload.width * right.payload.height - left.payload.width * left.payload.height
        || right.index - left.index,
    },
  ];

  const built = [];
  const seen = new Set();
  for (const variant of variants) {
    const ordered = [...indexed].sort(variant.sort).map((entry) => entry.payload);
    const signature = ordered.map((entry) => entry.relativePath).join("|");
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    built.push({ name: variant.name, ordered });
  }
  return built;
}

const HEURISTIC_METHODS = [
  { key: "bssf", method: "BestShortSideFit" },
  { key: "baf", method: "BestAreaFit" },
  { key: "blsf", method: "BestLongSideFit" },
  { key: "bl", method: "BottomLeftRule" },
  { key: "cp", method: "ContactPointRule" },
];

async function scorePackedFiles(files) {
  const imageFiles = ensureArray(files).filter((file) => /\.(png|jpg|jpeg)$/i.test(file.name));
  let totalAtlasArea = 0;
  for (const file of imageFiles) {
    const metadata = await sharp(file.buffer).metadata();
    const width = Number(metadata.width) || 0;
    const height = Number(metadata.height) || 0;
    totalAtlasArea += width * height;
  }
  return {
    atlasCount: imageFiles.length,
    totalAtlasArea,
  };
}

function fileToDataUrl(fileName, buffer) {
  const extension = path.extname(fileName).toLowerCase();
  const mimeType = extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/png";
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function summarizeGeneratedFiles(files) {
  return ensureArray(files).map((file) => ({
    name: file.name,
    bytes: file.buffer?.length || 0,
    isImage: /\.(png|jpg|jpeg)$/i.test(file.name),
  }));
}

function buildPreviewPayload(files) {
  const pages = [];
  for (const file of ensureArray(files)) {
    if (!/\.(png|jpg|jpeg)$/i.test(file.name)) {
      continue;
    }
    pages.push({
      name: file.name,
      bytes: file.buffer?.length || 0,
      dataUrl: fileToDataUrl(file.name, file.buffer),
    });
  }
  return {
    pages,
    outputFiles: summarizeGeneratedFiles(files),
  };
}

async function generateAtlasFiles(folderFsPath, images, settings, textureName) {
  if (!ensureArray(images).length) {
    return [];
  }
  const payloads = await createImagePayloads(folderFsPath, images);
  const orderVariants = buildOrderVariants(payloads);
  const baseOptions = buildAtlasOptions(settings, textureName);

  let best = null;

  try {
    for (const variant of orderVariants) {
      for (const heuristic of HEURISTIC_METHODS) {
        const options = {
          ...baseOptions,
          packer: "MaxRectsBin",
          packerMethod: heuristic.method,
        };
        const files = await packAsync(variant.ordered, options);
        const score = await scorePackedFiles(files);
        const ranked = {
          files,
          score,
          key: `${variant.name}:${heuristic.key}`,
        };

        if (!best) {
          best = ranked;
          continue;
        }

        const betterAtlasCount = ranked.score.atlasCount < best.score.atlasCount;
        const sameAtlasCount = ranked.score.atlasCount === best.score.atlasCount;
        const betterArea = ranked.score.totalAtlasArea < best.score.totalAtlasArea;
        const sameArea = ranked.score.totalAtlasArea === best.score.totalAtlasArea;

        if (betterAtlasCount || (sameAtlasCount && (betterArea || (sameArea && ranked.key < best.key)))) {
          best = ranked;
        }
      }
    }

    if (best) {
      return best.files;
    }

    return await packAsync(payloads, baseOptions);
  } catch (error) {
    if (error && typeof error === "object" && typeof error.description === "string") {
      if (error.description.toLowerCase().startsWith("invalid size")) {
        throw new Error(`${error.description}. Increase Layout Size or lower Scale.`);
      }
      throw new Error(error.description);
    }
    throw error;
  }
}

async function generateAtlasPreview(folderFsPath, images, settings, textureName) {
  const files = await generateAtlasFiles(folderFsPath, images, settings, textureName);
  return buildPreviewPayload(files);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveUniqueDestination(destinationPath) {
  if (!(await pathExists(destinationPath))) {
    return destinationPath;
  }

  const directory = path.dirname(destinationPath);
  const extension = path.extname(destinationPath);
  const baseName = path.basename(destinationPath, extension);
  let counter = 1;

  while (true) {
    const candidate = path.join(directory, `${baseName}-${counter}${extension}`);
    if (!(await pathExists(candidate))) {
      return candidate;
    }
    counter += 1;
  }
}

async function pruneEmptyDirectories(startDirectory, stopDirectory) {
  let current = startDirectory;

  while (current && current.startsWith(stopDirectory) && current !== stopDirectory) {
    const entries = await fs.readdir(current);
    if (entries.length > 0) {
      break;
    }
    await fs.rmdir(current);
    current = path.dirname(current);
  }
}

async function moveImagesIntoSourceFolder(folderFsPath, images, sourceFolderName) {
  const movedImages = [];

  for (const image of ensureArray(images)) {
    const currentRelativePath = normalizeRelativePath(image.relativePath);
    if (currentRelativePath.startsWith(`${sourceFolderName}/`)) {
      movedImages.push({
        ...image,
        relativePath: currentRelativePath,
      });
      continue;
    }

    const sourceAbsolutePath = path.join(folderFsPath, currentRelativePath);
    const desiredRelativePath = normalizeRelativePath(path.join(sourceFolderName, currentRelativePath));
    const desiredAbsolutePath = path.join(folderFsPath, desiredRelativePath);
    const finalAbsolutePath = await resolveUniqueDestination(desiredAbsolutePath);
    const finalRelativePath = normalizeRelativePath(path.relative(folderFsPath, finalAbsolutePath));

    await fs.mkdir(path.dirname(finalAbsolutePath), { recursive: true });
    await fs.rename(sourceAbsolutePath, finalAbsolutePath);
    await pruneEmptyDirectories(path.dirname(sourceAbsolutePath), folderFsPath);

    movedImages.push({
      ...image,
      relativePath: finalRelativePath,
      absolutePath: finalAbsolutePath,
      fileName: path.basename(finalRelativePath),
      directory: normalizeRelativePath(path.dirname(finalRelativePath)).replace(/^\.$/, ""),
    });
  }

  return movedImages;
}

async function writeGeneratedFiles(folderFsPath, files) {
  const generatedImagePaths = [];

  for (const file of ensureArray(files)) {
    const outputPath = path.join(folderFsPath, file.name);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, file.buffer);
    if (/\.(png|jpg|jpeg)$/i.test(file.name)) {
      generatedImagePaths.push(normalizeRelativePath(file.name));
    }
  }

  return generatedImagePaths;
}

async function exportAtlasPackage(folderFsPath, images, settings, textureName) {
  const manifest = await readManifest(folderFsPath);
  const shouldMoveSprites = Boolean(settings?.moveSpritesIntoFolder);
  const sourceFolderName = manifest.sourceFolderName || SOURCE_FOLDER_NAME;

  const exportImages = shouldMoveSprites
    ? await moveImagesIntoSourceFolder(folderFsPath, images, sourceFolderName)
    : images;

  const resolvedTextureName = getTextureName(folderFsPath, textureName);
  const files = await generateAtlasFiles(folderFsPath, exportImages, settings, resolvedTextureName);
  const generatedImagePaths = await writeGeneratedFiles(folderFsPath, files);

  await writeManifest(folderFsPath, {
    sourceFolderName,
    generatedImagePaths: [
      ...(manifest.generatedImagePaths || []),
      ...generatedImagePaths,
    ],
  });

  return {
    textureName: resolvedTextureName,
    movedImages: shouldMoveSprites,
    sourceFolderName,
    ...buildPreviewPayload(files),
  };
}

async function deleteImages(folderFsPath, relativePaths) {
  for (const relativePath of ensureArray(relativePaths)) {
    const normalized = normalizeRelativePath(relativePath);
    if (!normalized) {
      continue;
    }
    const absolutePath = path.join(folderFsPath, normalized);
    await fs.rm(absolutePath, { force: true });
    await pruneEmptyDirectories(path.dirname(absolutePath), folderFsPath);
  }
}

module.exports = {
  deleteImages,
  exportAtlasPackage,
  generateAtlasPreview,
  getTextureName,
};
