'use strict';
import * as vscode from 'vscode';
import { deployTenant, deployTenantGlobal, status, deploySiteCollection, deploySiteCollectionGlobal } from './command';
import { Auth, StatusBarItem, Output } from '.';

export function activate(context: vscode.ExtensionContext) {
  const statusBarItem: StatusBarItem = new StatusBarItem();
  const output: Output = new Output();
  const auth: Auth = new Auth(output, statusBarItem);
  
  const deployTenantAppCatalogCommand: vscode.Disposable = vscode.commands.registerCommand('rencoreSpfxDeploy.deployTenantAppCatalog', (fileUri: vscode.Uri): void => {
    deployTenant(fileUri, auth, output);
  });
  const deployTenantAppCatalogGlobalCommand: vscode.Disposable = vscode.commands.registerCommand('rencoreSpfxDeploy.deployTenantAppCatalogGlobal', (fileUri: vscode.Uri): void => {
    deployTenantGlobal(fileUri, auth, output);
  });
  const deploySiteCollectionAppCatalogCommand: vscode.Disposable = vscode.commands.registerCommand('rencoreSpfxDeploy.deploySiteCollectionAppCatalog', (fileUri: vscode.Uri): void => {
    deploySiteCollection(fileUri, auth, output);
  });
  const deploySiteCollctionAppCatalogGlobalCommand: vscode.Disposable = vscode.commands.registerCommand('rencoreSpfxDeploy.deploySiteCollectionAppCatalogGlobal', (fileUri: vscode.Uri): void => {
    deploySiteCollectionGlobal(fileUri, auth, output);
  });
  const statusCommand: vscode.Disposable = vscode.commands.registerCommand('rencoreSpfxDeploy.status', (fileUri: vscode.Uri): void => {
    status(auth, statusBarItem);
  });
  
  vscode.commands.executeCommand('setContext', 'hasSppkg', true);

  context.subscriptions.push(
    deployTenantAppCatalogCommand,
    deployTenantAppCatalogGlobalCommand,
    deploySiteCollectionAppCatalogCommand,
    deploySiteCollctionAppCatalogGlobalCommand,
    statusCommand,
    auth,
    statusBarItem,
    output
  );
}

// this method is called when your extension is deactivated
export function deactivate() {
}