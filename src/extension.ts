'use strict';
import * as vscode from 'vscode';
import { deploy, deployGlobal, status } from './command';
import { Auth, StatusBarItem, Output } from '.';

export function activate(context: vscode.ExtensionContext) {
  const statusBarItem: StatusBarItem = new StatusBarItem();
  const output: Output = new Output();
  const auth: Auth = new Auth(output, statusBarItem);
  
  const deployCommand: vscode.Disposable = vscode.commands.registerCommand('rencoreSpfxDeploy.deploy', (fileUri: vscode.Uri): void => {
    deploy(fileUri, auth, output);
  });
  const deployGlobalCommand: vscode.Disposable = vscode.commands.registerCommand('rencoreSpfxDeploy.deployGlobal', (fileUri: vscode.Uri): void => {
    deployGlobal(fileUri, auth, output);
  });
  const statusCommand: vscode.Disposable = vscode.commands.registerCommand('rencoreSpfxDeploy.status', (fileUri: vscode.Uri): void => {
    status(auth, statusBarItem);
  });
  
  vscode.commands.executeCommand('setContext', 'hasSppkg', true);

  context.subscriptions.push(
    deployCommand,
    deployGlobalCommand,
    statusCommand,
    auth,
    statusBarItem,
    output
  );
}

// this method is called when your extension is deactivated
export function deactivate() {
}