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

  function hydrateSelectors() {
    animationSelect.innerHTML = "";
    skinSelect.innerHTML = "";

    for (const animation of bundle.animations || []) {
      appendOption(animationSelect, animation);
    }
    for (const skin of bundle.skins || []) {
      appendOption(skinSelect, skin);
    }

    animationSelect.disabled = (bundle.animations || []).length === 0;
    skinSelect.disabled = (bundle.skins || []).length === 0;
  }

  function updatePlayButtonLabel() {
    playPauseButton.textContent = isPlaying ? "Pause" : "Play";
  }

  function loadSpineRuntime() {
    return new Promise((resolve, reject) => {
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = "https://unpkg.com/@esotericsoftware/spine-player@4.2.115/dist/spine-player.min.css";
      style.onload = () => {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/@esotericsoftware/spine-player@4.2.115/dist/iife/spine-player.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Spine runtime from CDN."));
        document.head.appendChild(script);
      };
      style.onerror = () => reject(new Error("Failed to load Spine runtime styles from CDN."));
      document.head.appendChild(style);
    });
  }

  function applySkin(skinName) {
    if (!player || !player.skeleton || !skinName) {
      return;
    }
    try {
      player.skeleton.setSkinByName(skinName);
      player.skeleton.setSlotsToSetupPose?.();
      player.animationState?.apply?.(player.skeleton);
      player.skeleton.updateWorldTransform?.();
      setStatus(`Skin updated: ${skinName}`);
    } catch {
      setStatus(`Unable to apply skin "${skinName}".`, true);
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
      setStatus(`Unable to set animation "${animationName}".`, true);
    }
  }

  async function initialize() {
    hydrateSelectors();
    setStatus("Loading Spine runtime...");

    try {
      await loadSpineRuntime();
      if (!window.spine || !window.spine.SpinePlayer) {
        throw new Error("Spine runtime API unavailable.");
      }

      const initialAnimation = (bundle.animations || [])[0];
      const initialSkin = (bundle.skins || [])[0];

      player = new window.spine.SpinePlayer(playerRoot, {
        skeleton: bundle.skeletonFileName,
        atlas: bundle.atlasFileName,
        rawDataURIs: bundle.rawDataURIs,
        showControls: false,
        animation: initialAnimation,
        skin: initialSkin,
        premultipliedAlpha: Boolean(bundle.premultipliedAlpha),
        success: (instance) => {
          player = instance;
          setStatus("Spine loaded. Play and skin controls are enabled.");
        },
        error: (_instance, reason) => {
          setStatus(`Spine load failed: ${reason || "Unknown error"}`, true);
        },
      });

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
