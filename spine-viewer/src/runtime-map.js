"use strict";

const RUNTIME_ASSETS = {
  "3.7": {
    stylePath: "vendor/spine/3.7/spine-player.css",
    scriptPath: "vendor/spine/3.7/spine-player.js",
  },
  "3.8": {
    stylePath: "vendor/spine/3.8/spine-player.css",
    scriptPath: "vendor/spine/3.8/spine-player.js",
  },
};

function resolveRuntimeAsset(runtimeSeries) {
  return RUNTIME_ASSETS[runtimeSeries] || null;
}

module.exports = {
  RUNTIME_ASSETS,
  resolveRuntimeAsset,
};
