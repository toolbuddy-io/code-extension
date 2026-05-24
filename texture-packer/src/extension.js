"use strict";

const vscode = require("vscode");
const { COMMANDS } = require("./constants");
const { openTexturePacker } = require("./viewer");

function activate(context) {
  const disposable = vscode.commands.registerCommand(COMMANDS.OPEN_FOLDER, async (resourceUri) => {
    try {
      await openTexturePacker(context, resourceUri);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Texture Packer: ${message}`);
    }
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
