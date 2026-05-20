"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs/promises");
const path = require("node:path");

const ACCEPTED_EXTENSIONS = new Set(["json", "atlas", "png", "jpg", "jpeg", "webp", "avif"]);
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "avif"]);
const RUNTIME_SERIES = new Set(["3.7", "3.8"]);

function normalizePathPart(input) {
  return String(input || "").replace(/\\/g, "/");
}

function toUniqueNames(values) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
}

function extractAtlasImageReferences(atlasContent) {
  const matches = String(atlasContent || "").match(/[^\s"']+\.(?:png|jpg|jpeg|webp|avif)/gi) || [];
  return Array.from(new Set(matches.map((entry) => normalizePathPart(entry).trim()).filter(Boolean)));
}

function extractAtlasRegionNames(atlasContent) {
  const lines = String(atlasContent || "").replace(/\r\n?/g, "\n").split("\n");
  const regionNames = new Set();
  let currentPageSeen = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      currentPageSeen = false;
      continue;
    }
    if (/^\s/.test(rawLine)) {
      continue;
    }
    if (line.includes(":")) {
      continue;
    }
    if (!currentPageSeen) {
      currentPageSeen = true;
      continue;
    }
    regionNames.add(line);
  }

  return Array.from(regionNames);
}

function parseSkeletonMetadata(skeletonJson) {
  try {
    const parsed = JSON.parse(skeletonJson);
    const versionLabel = parsed?.skeleton?.spine?.trim() || "Unknown";

    const rawBounds = {
      x: parsed?.skeleton?.x,
      y: parsed?.skeleton?.y,
      width: parsed?.skeleton?.width,
      height: parsed?.skeleton?.height,
    };
    const hasFiniteBounds = [rawBounds.width, rawBounds.height].every(
      (value) => typeof value === "number" && Number.isFinite(value),
    );
    const skeletonBounds =
      hasFiniteBounds && rawBounds.width > 0 && rawBounds.height > 0
        ? {
            x: typeof rawBounds.x === "number" && Number.isFinite(rawBounds.x) ? rawBounds.x : -rawBounds.width / 2,
            y: typeof rawBounds.y === "number" && Number.isFinite(rawBounds.y) ? rawBounds.y : -rawBounds.height / 2,
            width: rawBounds.width,
            height: rawBounds.height,
          }
        : null;

    const animationNames = Array.isArray(parsed?.animations)
      ? parsed.animations.map((entry) => entry?.name || "")
      : parsed?.animations && typeof parsed.animations === "object"
        ? Object.keys(parsed.animations)
        : [];

    const skinNames = Array.isArray(parsed?.skins)
      ? parsed.skins.map((entry) => entry?.name || "")
      : parsed?.skins && typeof parsed.skins === "object"
        ? Object.keys(parsed.skins)
        : [];

    return {
      versionLabel,
      animationNames: toUniqueNames(animationNames),
      skinNames: toUniqueNames(skinNames),
      skeletonBounds,
    };
  } catch {
    return {
      versionLabel: "Unknown",
      animationNames: [],
      skinNames: [],
      skeletonBounds: null,
    };
  }
}

function addAttachmentHint(target, value) {
  if (typeof value !== "string") {
    return;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return;
  }
  target.add(trimmed);
  const baseName = trimmed.split("/").pop();
  if (baseName) {
    target.add(baseName);
  }
}

function collectAttachmentRegionHintsFromSkeleton(skeletonJson) {
  try {
    const parsed = JSON.parse(skeletonJson);
    const hints = new Set();

    const collectSlotAttachmentMap = (slotMap) => {
      if (!slotMap || typeof slotMap !== "object") {
        return;
      }
      for (const [attachmentName, attachmentValue] of Object.entries(slotMap)) {
        addAttachmentHint(hints, attachmentName);
        if (attachmentValue && typeof attachmentValue === "object") {
          addAttachmentHint(hints, attachmentValue.name);
          addAttachmentHint(hints, attachmentValue.path);
        }
      }
    };

    const collectSkinObject = (skinObject) => {
      if (!skinObject || typeof skinObject !== "object") {
        return;
      }
      const attachments = skinObject.attachments;
      if (attachments && typeof attachments === "object") {
        for (const slotMap of Object.values(attachments)) {
          collectSlotAttachmentMap(slotMap);
        }
        return;
      }
      for (const slotMap of Object.values(skinObject)) {
        collectSlotAttachmentMap(slotMap);
      }
    };

    const skins = parsed?.skins;
    if (Array.isArray(skins)) {
      for (const skin of skins) {
        collectSkinObject(skin);
      }
    } else if (skins && typeof skins === "object") {
      for (const skin of Object.values(skins)) {
        collectSkinObject(skin);
      }
    }

    return Array.from(hints);
  } catch {
    return [];
  }
}

function toComparableSpineStem(fileName) {
  const normalized = normalizePathPart(fileName).split("/").pop() || fileName;
  return normalized
    .toLowerCase()
    .replace(/\.(json|atlas)$/i, "")
    .replace(/[-_](pro|ess|pma|run)$/g, "");
}

function scoreSpineJsonAtlasPair(skeletonFileName, atlasFileName, attachmentHints, atlasRegions) {
  let score = 0;
  const skeletonStem = toComparableSpineStem(skeletonFileName);
  const atlasStem = toComparableSpineStem(atlasFileName);

  if (skeletonStem === atlasStem) {
    score += 100;
  } else if (skeletonStem.startsWith(atlasStem) || atlasStem.startsWith(skeletonStem)) {
    score += 40;
  }

  const regionSet = new Set(atlasRegions.map((entry) => entry.toLowerCase()));
  for (const hint of attachmentHints) {
    if (regionSet.has(hint.toLowerCase())) {
      score += 1;
    }
  }

  return score;
}

function resolveRuntimeSeries(versionLabel) {
  const match = String(versionLabel || "").match(/^(\d+)\.(\d+)/);
  if (!match) {
    return null;
  }
  const series = `${match[1]}.${match[2]}`;
  return RUNTIME_SERIES.has(series) ? series : null;
}

function normalizeSkeletonJsonForRuntime(skeletonText, runtimeSeries) {
  try {
    const parsed = JSON.parse(skeletonText);
    if (!parsed || typeof parsed !== "object") {
      return skeletonText;
    }

    const isLegacyRuntime = runtimeSeries?.startsWith("3.") ?? false;
    const requiresLegacySkinShape = runtimeSeries === "3.7";
    let didMutate = false;

    if (!requiresLegacySkinShape && parsed.skins && !Array.isArray(parsed.skins) && typeof parsed.skins === "object") {
      const skinsMap = parsed.skins;
      parsed.skins = Object.entries(skinsMap).map(([name, attachments]) => ({
        name,
        attachments: attachments && typeof attachments === "object" ? attachments : {},
      }));
      didMutate = true;
    }

    if (isLegacyRuntime) {
      const rewriteCurves = (value) => {
        if (Array.isArray(value)) {
          for (const item of value) {
            rewriteCurves(item);
          }
          return;
        }
        if (!value || typeof value !== "object") {
          return;
        }

        const record = value;
        const curve = record.curve;
        if (Array.isArray(curve) && curve.length >= 4) {
          const [c1, c2, c3, c4] = curve;
          if ([c1, c2, c3, c4].every((entry) => typeof entry === "number" && Number.isFinite(entry))) {
            record.curve = c1;
            record.c2 = c2;
            record.c3 = c3;
            record.c4 = c4;
            didMutate = true;
          }
        }

        for (const nested of Object.values(record)) {
          rewriteCurves(nested);
        }
      };
      rewriteCurves(parsed.animations);
    }

    if (!didMutate) {
      return skeletonText;
    }
    return JSON.stringify(parsed);
  } catch {
    return skeletonText;
  }
}

function normalizeAtlasTextForRuntime(atlasText) {
  const withoutBom = String(atlasText || "").replace(/^\uFEFF/, "");
  const normalizedNewlines = withoutBom.replace(/\r\n?/g, "\n");
  const lines = normalizedNewlines.split("\n");
  while (lines.length > 0 && lines[0].trim() === "") {
    lines.shift();
  }
  return lines.join("\n");
}

function mimeForExtension(extension) {
  switch (extension.toLowerCase()) {
    case "json":
      return "application/json";
    case "atlas":
      return "text/plain";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

function toDataUri(buffer, mimeType) {
  return `data:${mimeType};base64,${Buffer.from(buffer).toString("base64")}`;
}

function getFileNameVariants(relativePath) {
  const normalizedRelativePath = normalizePathPart(relativePath).trim();
  const baseName = normalizedRelativePath.split("/").pop() || normalizedRelativePath;
  const variants = new Set();

  const addVariant = (value) => {
    const normalized = normalizePathPart(value).trim();
    if (!normalized) {
      return;
    }
    variants.add(normalized);

    const withoutDotSlash = normalized.replace(/^\.\//, "");
    if (withoutDotSlash) {
      variants.add(withoutDotSlash);
    }

    const withoutLeadingSlash = withoutDotSlash.replace(/^\/+/, "");
    if (withoutLeadingSlash) {
      variants.add(withoutLeadingSlash);
      variants.add(`./${withoutLeadingSlash}`);
      const plainBase = withoutLeadingSlash.split("/").pop();
      if (plainBase) {
        variants.add(plainBase);
        variants.add(`./${plainBase}`);
      }
    }
  };

  addVariant(normalizedRelativePath);
  addVariant(baseName);

  return variants;
}

function detectPremultipliedAlpha(atlasFileName, atlasText, atlasImageRefs) {
  if (/(^|[_-])pma([_.-]|$)/i.test(atlasFileName)) {
    return true;
  }
  if (/(^|\n)\s*pma\s*:\s*true\s*($|\n)/i.test(atlasText)) {
    return true;
  }
  return atlasImageRefs.some((name) => /(^|[_-])pma([_.-]|$)/i.test(name));
}

async function listFilesRecursive(rootDir) {
  const output = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const relativePath = normalizePathPart(path.relative(rootDir, fullPath));
      const extension = path.extname(entry.name).replace(/^\./, "").toLowerCase();
      if (!ACCEPTED_EXTENSIONS.has(extension)) {
        continue;
      }
      const stats = await fs.stat(fullPath);
      output.push({
        fullPath,
        relativePath,
        fileName: entry.name,
        extension,
        size: stats.size,
      });
    }
  }

  await walk(rootDir);
  return output;
}

async function directoryHasSpineFiles(rootDir) {
  const absoluteRoot = path.resolve(rootDir);
  let foundJson = false;
  let foundAtlas = false;
  let foundImage = false;

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (foundJson && foundAtlas && foundImage) {
        return;
      }
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const extension = path.extname(entry.name).replace(/^\./, "").toLowerCase();
      if (extension === "json") {
        foundJson = true;
      } else if (extension === "atlas") {
        foundAtlas = true;
      } else if (IMAGE_EXTENSIONS.has(extension)) {
        foundImage = true;
      }
    }
  }

  await walk(absoluteRoot);
  return {
    hasAnySpineFile: foundJson || foundAtlas || foundImage,
    hasCoreBundleFiles: foundJson && foundAtlas && foundImage,
  };
}

async function extractSpineBundleFromDirectory(rootDir) {
  const absoluteRoot = path.resolve(rootDir);
  const acceptedFiles = await listFilesRecursive(absoluteRoot);
  if (!acceptedFiles.length) {
    throw new Error("No supported Spine files found. Add .json, .atlas, and atlas image files.");
  }

  const skeletonFiles = acceptedFiles.filter((file) => file.extension === "json");
  const atlasFiles = acceptedFiles.filter((file) => file.extension === "atlas");
  const imageFiles = acceptedFiles.filter((file) => IMAGE_EXTENSIONS.has(file.extension));

  if (!skeletonFiles.length || !atlasFiles.length || !imageFiles.length) {
    throw new Error("Missing required Spine files. Provide a skeleton JSON, atlas file, and atlas page images.");
  }

  const atlasPrepared = await Promise.all(
    atlasFiles.map(async (file) => {
      const originalText = await fs.readFile(file.fullPath, "utf8");
      const normalizedText = normalizeAtlasTextForRuntime(originalText);
      return {
        file,
        originalText,
        normalizedText,
        imageRefs: extractAtlasImageReferences(normalizedText),
        regionNames: extractAtlasRegionNames(normalizedText),
      };
    }),
  );

  const skeletonPrepared = await Promise.all(
    skeletonFiles.map(async (file) => {
      const skeletonText = await fs.readFile(file.fullPath, "utf8");
      const metadata = parseSkeletonMetadata(skeletonText);
      const runtimeSeries = resolveRuntimeSeries(metadata.versionLabel);
      return {
        file,
        metadata,
        runtimeSeries,
        normalizedText: normalizeSkeletonJsonForRuntime(skeletonText, runtimeSeries),
        attachmentHints: collectAttachmentRegionHintsFromSkeleton(skeletonText),
      };
    }),
  );

  let selectedSkeleton = skeletonPrepared[0];
  let selectedAtlas = atlasPrepared[0];
  let bestPairScore = Number.NEGATIVE_INFINITY;

  for (const skeletonCandidate of skeletonPrepared) {
    for (const atlasCandidate of atlasPrepared) {
      const score =
        scoreSpineJsonAtlasPair(
          skeletonCandidate.file.fileName,
          atlasCandidate.file.fileName,
          skeletonCandidate.attachmentHints,
          atlasCandidate.regionNames,
        ) + (skeletonCandidate.runtimeSeries ? 0 : -1000);
      if (score > bestPairScore) {
        bestPairScore = score;
        selectedSkeleton = skeletonCandidate;
        selectedAtlas = atlasCandidate;
      }
    }
  }

  if (!selectedSkeleton.runtimeSeries) {
    throw new Error(
      `Unsupported Spine version ${selectedSkeleton.metadata.versionLabel}. Supported versions are Spine 3.7 and 3.8 only.`,
    );
  }
  if (!selectedSkeleton.metadata.animationNames.length) {
    throw new Error("No animations found in the selected Spine skeleton JSON.");
  }

  const variantToFile = new Map();
  for (const file of acceptedFiles) {
    for (const variant of getFileNameVariants(file.relativePath)) {
      variantToFile.set(variant, file);
    }
  }

  const missingAtlasPages = [];
  for (const pageRef of selectedAtlas.imageRefs) {
    const baseName = pageRef.split("/").pop() || pageRef;
    if (!variantToFile.has(pageRef) && !variantToFile.has(baseName)) {
      missingAtlasPages.push(pageRef);
    }
  }

  if (missingAtlasPages.length) {
    throw new Error(`Atlas references missing image files: ${missingAtlasPages.join(", ")}`);
  }

  const totalBytes = acceptedFiles.reduce((sum, file) => sum + file.size, 0);
  const rawDataURIs = {};
  for (const file of acceptedFiles) {
    const rawBuffer = await fs.readFile(file.fullPath);
    const mappedData = toDataUri(rawBuffer, mimeForExtension(file.extension));
    for (const variant of getFileNameVariants(file.relativePath)) {
      rawDataURIs[variant] = mappedData;
    }
  }

  rawDataURIs[selectedSkeleton.file.fileName] = toDataUri(
    Buffer.from(selectedSkeleton.normalizedText, "utf8"),
    "application/json",
  );
  rawDataURIs[selectedAtlas.file.fileName] = toDataUri(
    Buffer.from(selectedAtlas.normalizedText, "utf8"),
    "text/plain",
  );

  return {
    sourceDirectory: absoluteRoot,
    fileCount: acceptedFiles.length,
    totalBytes,
    skeletonFileName: selectedSkeleton.file.fileName,
    skeletonRelativePath: selectedSkeleton.file.relativePath,
    skeletonBounds: selectedSkeleton.metadata.skeletonBounds,
    atlasFileName: selectedAtlas.file.fileName,
    atlasRelativePath: selectedAtlas.file.relativePath,
    rawDataURIs,
    premultipliedAlpha: detectPremultipliedAlpha(
      selectedAtlas.file.fileName,
      selectedAtlas.normalizedText,
      selectedAtlas.imageRefs,
    ),
    versionLabel: selectedSkeleton.metadata.versionLabel,
    runtimeSeries: selectedSkeleton.runtimeSeries,
    animations: selectedSkeleton.metadata.animationNames,
    skins: selectedSkeleton.metadata.skinNames,
  };
}

module.exports = {
  directoryHasSpineFiles,
  extractSpineBundleFromDirectory,
};
