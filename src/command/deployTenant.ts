import * as vscode from 'vscode';
import { Utils, Auth, Output } from '..';

export function deployTenant(fileUri: vscode.Uri, auth: Auth, output: Output): void {
  if (!Utils.warnIfNotSppkg(fileUri)) {
    return;
  }

  Utils.deploySolution(fileUri, true, false, auth, output);
}