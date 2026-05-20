"use strict";

(function bootstrap() {
  const bundle = window.__SPINE_BUNDLE__;
  const playerRoot = document.getElementById("playerRoot");
  const statusText = document.getElementById("statusText");
  const animationSelect = document.getElementById("animationSelect");
  const skinSelect = document.getElementById("skinSelect");
  const loopToggle = document.getElementById("loopToggle");
  const playPauseButton = document.getElementById("playPauseButton");

  let player = null;
  let isPlaying = true;

  function assertBundleSchema() {
    if (!bundle || typeof bundle !== "object") {
      throw new Error("Invalid viewer payload. Reload VS Code window and open the player again.");
    }
    if (bundle.schemaVersion !== 2) {
      throw new Error("Extension updated. Please run: Developer: Reload Window, then open Spine Animation Player again.");
    }
  }

  function setStatus(message, isError) {
    statusText.textContent = message;
    statusText.classList.toggle("error", Boolean(isError));
  }

  function appendOption(select, value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }

  function toUniqueNames(values) {
    return Array.from(new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean)));
  }

  function extractRuntimeNameList(input) {
    if (!input) {
      return [];
    }

    if (Array.isArray(input)) {
      return toUniqueNames(
        input.map((entry) => {
          if (typeof entry === "string") {
            return entry;
          }
          if (entry && typeof entry === "object" && "name" in entry) {
            const name = entry.name;
            return typeof name === "string" ? name : "";
          }
          return "";
        }),
      );
    }

    if (input instanceof Map) {
      return toUniqueNames(
        Array.from(input.values()).map((entry) => {
          if (typeof entry === "string") {
            return entry;
          }
          if (entry && typeof entry === "object" && "name" in entry) {
            const name = entry.name;
            return typeof name === "string" ? name : "";
          }
          return "";
        }),
      );
    }

    if (typeof input === "object") {
      return toUniqueNames(Object.keys(input));
    }

    return [];
  }

  function pickInitialAnimation(animations) {
    if (!animations.length) {
      return "";
    }
    const scored = animations.map((name) => {
      const lower = name.toLowerCase();
      let score = 0;
      if (lower === "idle") score += 120;
      if (/(^|[_-])idle($|[_-])/.test(lower)) score += 80;
      if (/(^|[_-])(run|walk|move)($|[_-])/.test(lower)) score += 70;
      if (/(effect|fx|smoke|dust|shadow|overlay)/.test(lower)) score -= 50;
      return { name, score };
    });
    scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    return scored[0].name;
  }

  function renderSelectOptions(select, values) {
    select.innerHTML = "";
    for (const value of values) {
      appendOption(select, value);
    }
    select.disabled = values.length === 0;
  }

  function hydrateSelectors() {
    renderSelectOptions(animationSelect, bundle.animations || []);
    renderSelectOptions(skinSelect, bundle.skins || []);
  }

  function updatePlayButtonLabel() {
    playPauseButton.textContent = isPlaying ? "Pause" : "Play";
  }

  function loadStyle(url) {
    return new Promise((resolve, reject) => {
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = url;
      style.onload = () => resolve();
      style.onerror = () => reject(new Error(`Failed to load stylesheet: ${url}`));
      document.head.appendChild(style);
    });
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load runtime script: ${url}`));
      document.head.appendChild(script);
    });
  }

  function buildRuntimeRawDataUris(rawDataUris) {
    const mapped = {};
    for (const [key, value] of Object.entries(rawDataUris || {})) {
      const path = String(key || "").trim();
      if (!path) {
        continue;
      }
      mapped[path] = value;
    }
    return mapped;
  }

  function getPathVariants(inputPath) {
    const normalized = String(inputPath || "").replace(/\\/g, "/").trim();
    if (!normalized) {
      return [];
    }
    const noDot = normalized.replace(/^\.\//, "");
    const noLeadingSlash = noDot.replace(/^\/+/, "");
    const baseName = noLeadingSlash.split("/").pop() || noLeadingSlash;
    return Array.from(
      new Set([
        normalized,
        noDot,
        noLeadingSlash,
        `./${noLeadingSlash}`,
        baseName,
        `./${baseName}`,
      ].filter(Boolean)),
    );
  }

  function ensureBundleAssetMapping(mappedRawDataUris) {
    const mapped = { ...(mappedRawDataUris || {}) };
    const skeletonCandidates = [
      bundle.skeletonFileName,
      bundle.skeletonRelativePath,
    ];
    const atlasCandidates = [
      bundle.atlasFileName,
      bundle.atlasRelativePath,
    ];

    const readFirst = (candidates) => {
      for (const candidate of candidates) {
        for (const variant of getPathVariants(candidate)) {
          if (mapped[variant]) {
            return mapped[variant];
          }
        }
      }
      return null;
    };

    const skeletonValue = readFirst(skeletonCandidates) || bundle.skeletonUrl || null;
    const atlasValue = readFirst(atlasCandidates) || bundle.atlasUrl || null;

    if (skeletonValue) {
      for (const candidate of skeletonCandidates) {
        for (const variant of getPathVariants(candidate)) {
          mapped[variant] = skeletonValue;
        }
      }
    }

    if (atlasValue) {
      for (const candidate of atlasCandidates) {
        for (const variant of getPathVariants(candidate)) {
          mapped[variant] = atlasValue;
        }
      }
    }

    return mapped;
  }

  function patchSpine37RawDataSupport() {
    if (!window.spine || window.spine.__toolbuddySpine37PatchApplied) {
      return;
    }
    const assetManagerPrototype = window.spine.webgl?.AssetManager?.prototype;
    if (!assetManagerPrototype) {
      return;
    }

    const readRawMap = (target) => {
      if (!target.rawDataUris || typeof target.rawDataUris !== "object") {
        target.rawDataUris = {};
      }
      const rawDataUris = target.rawDataUris;
      const globalRaw = window.__toolbuddySpine37RawDataURIs;
      if (globalRaw && !target.__toolbuddyRawDataMerged) {
        Object.assign(rawDataUris, globalRaw);
        target.__toolbuddyRawDataMerged = true;
      }
      return rawDataUris;
    };

    assetManagerPrototype.downloadText = function downloadText(url, success, error) {
      const request = new XMLHttpRequest();
      request.overrideMimeType("text/html");
      const rawDataUris = readRawMap(this);
      const resolvedUrl = rawDataUris[url] || url;
      request.open("GET", resolvedUrl, true);
      request.onload = () => {
        const isInlineOrBlob = resolvedUrl.startsWith("blob:") || resolvedUrl.startsWith("data:");
        if (request.status === 200 || (isInlineOrBlob && request.status === 0)) {
          success(request.responseText);
        } else {
          error(request.status, request.responseText);
        }
      };
      request.onerror = () => {
        error(request.status, request.responseText);
      };
      request.send();
    };

    assetManagerPrototype.setRawDataURI = function setRawDataURI(path, data) {
      const rawDataUris = readRawMap(this);
      const pathPrefix = typeof this.pathPrefix === "string" ? this.pathPrefix : "";
      rawDataUris[`${pathPrefix}${path}`] = data;
    };

    assetManagerPrototype.loadText = function loadText(path, success, error) {
      const pathPrefix = typeof this.pathPrefix === "string" ? this.pathPrefix : "";
      const fullPath = `${pathPrefix}${path}`;
      this.toLoad = (Number(this.toLoad) || 0) + 1;
      this.downloadText(
        fullPath,
        (data) => {
          this.assets[fullPath] = data;
          if (success) {
            success(fullPath, data);
          }
          this.toLoad = (Number(this.toLoad) || 1) - 1;
          this.loaded = (Number(this.loaded) || 0) + 1;
        },
        (_status, responseText) => {
          const message = `Couldn't load text ${fullPath}: ${responseText}`;
          this.errors[fullPath] = message;
          if (error) {
            error(fullPath, message);
          }
          this.toLoad = (Number(this.toLoad) || 1) - 1;
          this.loaded = (Number(this.loaded) || 0) + 1;
        },
      );
    };

    assetManagerPrototype.loadTexture = function loadTexture(path, success, error) {
      const pathPrefix = typeof this.pathPrefix === "string" ? this.pathPrefix : "";
      const fullPath = `${pathPrefix}${path}`;
      const storagePath = fullPath;
      this.toLoad = (Number(this.toLoad) || 0) + 1;
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        this.assets[storagePath] = this.textureLoader(image);
        this.toLoad = (Number(this.toLoad) || 1) - 1;
        this.loaded = (Number(this.loaded) || 0) + 1;
        if (success) {
          success(fullPath, image);
        }
      };
      image.onerror = () => {
        const message = `Couldn't load image ${fullPath}`;
        this.errors[fullPath] = message;
        this.toLoad = (Number(this.toLoad) || 1) - 1;
        this.loaded = (Number(this.loaded) || 0) + 1;
        if (error) {
          error(fullPath, message);
        }
      };
      const rawDataUris = readRawMap(this);
      image.src = rawDataUris[fullPath] || fullPath;
    };

    assetManagerPrototype.loadTextureAtlas = function loadTextureAtlas(path, success, error) {
      const pathPrefix = typeof this.pathPrefix === "string" ? this.pathPrefix : "";
      const originalPath = path;
      const parent = originalPath.lastIndexOf("/") >= 0 ? originalPath.substring(0, originalPath.lastIndexOf("/")) : "";
      const fullPath = `${pathPrefix}${path}`;
      this.toLoad = (Number(this.toLoad) || 0) + 1;

      this.downloadText(
        fullPath,
        (atlasData) => {
          const pagesLoaded = { count: 0 };
          const atlasPages = [];
          try {
            new window.spine.TextureAtlas(atlasData, (atlasPath) => {
              atlasPages.push(parent === "" ? atlasPath : `${parent}/${atlasPath}`);
              const placeholder = document.createElement("img");
              placeholder.width = 16;
              placeholder.height = 16;
              return new window.spine.FakeTexture(placeholder);
            });
          } catch (atlasError) {
            const message = `Couldn't load texture atlas ${fullPath}: ${
              atlasError instanceof Error ? atlasError.message : String(atlasError)
            }`;
            this.errors[fullPath] = message;
            if (error) {
              error(fullPath, message);
            }
            this.toLoad = (Number(this.toLoad) || 1) - 1;
            this.loaded = (Number(this.loaded) || 0) + 1;
            return;
          }

          if (!atlasPages.length) {
            const message = `Couldn't load texture atlas ${fullPath}: no pages found in atlas.`;
            this.errors[fullPath] = message;
            if (error) {
              error(fullPath, message);
            }
            this.toLoad = (Number(this.toLoad) || 1) - 1;
            this.loaded = (Number(this.loaded) || 0) + 1;
            return;
          }

          let pageLoadError = false;
          for (const atlasPage of atlasPages) {
            this.loadTexture(
              atlasPage,
              (imagePath) => {
                pagesLoaded.count += 1;
                if (pagesLoaded.count !== atlasPages.length) {
                  return;
                }
                if (pageLoadError) {
                  const message = `Couldn't load texture atlas page ${imagePath} of atlas ${fullPath}`;
                  this.errors[fullPath] = message;
                  if (error) {
                    error(fullPath, message);
                  }
                  this.toLoad = (Number(this.toLoad) || 1) - 1;
                  this.loaded = (Number(this.loaded) || 0) + 1;
                  return;
                }
                try {
                  const atlas = new window.spine.TextureAtlas(atlasData, (atlasPath) => {
                    const assetPath = parent === "" ? atlasPath : `${parent}/${atlasPath}`;
                    return this.get(assetPath);
                  });
                  this.assets[fullPath] = atlas;
                  if (success) {
                    success(fullPath, atlas);
                  }
                  this.toLoad = (Number(this.toLoad) || 1) - 1;
                  this.loaded = (Number(this.loaded) || 0) + 1;
                } catch (atlasError) {
                  const message = `Couldn't load texture atlas ${fullPath}: ${
                    atlasError instanceof Error ? atlasError.message : String(atlasError)
                  }`;
                  this.errors[fullPath] = message;
                  if (error) {
                    error(fullPath, message);
                  }
                  this.toLoad = (Number(this.toLoad) || 1) - 1;
                  this.loaded = (Number(this.loaded) || 0) + 1;
                }
              },
              (imagePath) => {
                pageLoadError = true;
                pagesLoaded.count += 1;
                if (pagesLoaded.count === atlasPages.length) {
                  const message = `Couldn't load texture atlas page ${imagePath} of atlas ${fullPath}`;
                  this.errors[fullPath] = message;
                  if (error) {
                    error(fullPath, message);
                  }
                  this.toLoad = (Number(this.toLoad) || 1) - 1;
                  this.loaded = (Number(this.loaded) || 0) + 1;
                }
              },
            );
          }
        },
        (_status, responseText) => {
          const message = `Couldn't load texture atlas ${fullPath}: ${responseText}`;
          this.errors[fullPath] = message;
          if (error) {
            error(fullPath, message);
          }
          this.toLoad = (Number(this.toLoad) || 1) - 1;
          this.loaded = (Number(this.loaded) || 0) + 1;
        },
      );
    };

    window.spine.__toolbuddySpine37PatchApplied = true;
  }

  async function loadSpineRuntime(runtimeSeries) {
    if (runtimeSeries !== "3.7" && runtimeSeries !== "3.8") {
      throw new Error(`Spine ${runtimeSeries || "unknown"} is not supported in this extension build. Use Spine 3.7 or 3.8.`);
    }

    const runtime = bundle.runtimeAsset;
    if (!runtime || !runtime.style || !runtime.script) {
      throw new Error(`Runtime asset mapping is missing for Spine ${runtimeSeries || "unknown"}.`);
    }
    await loadStyle(runtime.style);
    await loadScript(runtime.script);
  }

  function applySkin(skinName) {
    if (!player || !player.skeleton || !skinName) {
      return;
    }

    const skeletonData = player.skeleton.data;
    if (skeletonData?.findSkin && !skeletonData.findSkin(skinName)) {
      setStatus(`Skin '${skinName}' is not available in this skeleton.`, true);
      return;
    }

    try {
      player.skeleton.setSkinByName(skinName);
      player.skeleton.setSlotsToSetupPose?.();
      player.animationState?.apply?.(player.skeleton);
      player.skeleton.updateWorldTransform?.();
      setStatus(`Skin updated: ${skinName}`);
    } catch {
      setStatus(`Unable to apply skin '${skinName}'.`, true);
    }
  }

  function applyAnimation(animationName) {
    if (!player || !animationName) {
      return;
    }
    try {
      player.setAnimation(animationName, loopToggle.checked);
      setStatus(`Animation updated: ${animationName}`);
    } catch {
      setStatus(`Unable to set animation '${animationName}'.`, true);
    }
  }

  function syncRuntimeControls(instance) {
    const skeletonData = instance?.skeleton?.data;
    const runtimeAnimations = extractRuntimeNameList(skeletonData?.animations);
    const runtimeSkins = extractRuntimeNameList(skeletonData?.skins);

    const resolvedAnimations = runtimeAnimations.length ? runtimeAnimations : (bundle.animations || []);
    const resolvedSkins = runtimeSkins.length ? runtimeSkins : (bundle.skins || []);

    renderSelectOptions(animationSelect, resolvedAnimations);
    renderSelectOptions(skinSelect, resolvedSkins);

    const activeAnimation = instance?.animationState?.getCurrent?.(0)?.animation?.name || "";
    const activeSkin = instance?.skeleton?.skin?.name || "";
    const fallbackAnimation = pickInitialAnimation(resolvedAnimations);
    const fallbackSkin = resolvedSkins[0] || "";

    const selectedAnimation = resolvedAnimations.includes(activeAnimation) ? activeAnimation : fallbackAnimation;
    const selectedSkin = resolvedSkins.includes(activeSkin) ? activeSkin : fallbackSkin;

    if (selectedAnimation) {
      animationSelect.value = selectedAnimation;
    }
    if (selectedSkin) {
      skinSelect.value = selectedSkin;
    }
  }

  async function initialize() {
    hydrateSelectors();
    setStatus(`Loading Spine runtime (${bundle.runtimeSeries || "unknown"})...`);

    try {
      assertBundleSchema();
      await loadSpineRuntime(bundle.runtimeSeries);
      if (!window.spine || !window.spine.SpinePlayer) {
        throw new Error("Spine runtime API unavailable.");
      }

      const useEmbeddedRawData = Boolean(bundle.rawDataURIs && Object.keys(bundle.rawDataURIs).length > 0);
      let runtimeRawDataUris = null;

      if (useEmbeddedRawData) {
        runtimeRawDataUris = ensureBundleAssetMapping(buildRuntimeRawDataUris(bundle.rawDataURIs));
        if (!runtimeRawDataUris[bundle.skeletonFileName] || !runtimeRawDataUris[bundle.atlasFileName]) {
          throw new Error("Prepared Spine bundle is missing skeleton or atlas data mapping.");
        }
      }

      if (bundle.runtimeSeries === "3.7" && useEmbeddedRawData) {
        patchSpine37RawDataSupport();
        window.__toolbuddySpine37RawDataURIs = runtimeRawDataUris;
      } else {
        window.__toolbuddySpine37RawDataURIs = undefined;
      }

      const initialAnimation = pickInitialAnimation(bundle.animations || []);
      const initialSkin = (bundle.skins || [])[0] || "";
      const resolvedSkeletonSource = useEmbeddedRawData ? bundle.skeletonFileName : bundle.skeletonUrl;
      const resolvedAtlasSource = useEmbeddedRawData ? bundle.atlasFileName : bundle.atlasUrl;

      const playerConfig = {
        skeleton: resolvedSkeletonSource,
        atlas: resolvedAtlasSource,
        showControls: false,
        premultipliedAlpha: Boolean(bundle.premultipliedAlpha),
        animation: initialAnimation || undefined,
        skin: initialSkin || undefined,
        success: (instance) => {
          player = instance;
          syncRuntimeControls(instance);
          setStatus("");
        },
        error: (_instance, reason) => {
          setStatus(`Spine load failed: ${reason || "Unknown error"}`, true);
        },
      };

      if (!useEmbeddedRawData) {
        playerConfig.jsonUrl = resolvedSkeletonSource;
        playerConfig.atlasUrl = resolvedAtlasSource;
      } else {
        playerConfig.jsonUrl = bundle.skeletonFileName;
        playerConfig.atlasUrl = bundle.atlasFileName;
      }

      if (useEmbeddedRawData && runtimeRawDataUris) {
        playerConfig.rawDataURIs = runtimeRawDataUris;
      }

      player = new window.spine.SpinePlayer(playerRoot, playerConfig);

      animationSelect.addEventListener("change", () => {
        applyAnimation(animationSelect.value);
      });

      skinSelect.addEventListener("change", () => {
        applySkin(skinSelect.value);
      });

      loopToggle.addEventListener("change", () => {
        if (animationSelect.value) {
          applyAnimation(animationSelect.value);
        }
      });

      playPauseButton.addEventListener("click", () => {
        if (!player) {
          return;
        }
        if (isPlaying) {
          player.pause?.();
          isPlaying = false;
          setStatus("Playback paused.");
        } else {
          player.play?.();
          isPlaying = true;
          setStatus("Playback resumed.");
        }
        updatePlayButtonLabel();
      });

      updatePlayButtonLabel();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), true);
    }
  }

  void initialize();
})();
