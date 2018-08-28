import * as vscode from 'vscode';
import { Utils, Auth, Output } from '..';

export function deploySiteCollectionGlobal(fileUri: vscode.Uri, auth: Auth, output: Output): void {
  if (!Utils.warnIfNotSppkg(fileUri)) {
    return;
  }

  Utils.deploySolution(fileUri, false, true, auth, output);
}