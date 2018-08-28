import * as vscode from 'vscode';
import { Utils, Auth, Output } from '..';

export function deployTenantGlobal(fileUri: vscode.Uri, auth: Auth, output: Output): void {
  if (!Utils.warnIfNotSppkg(fileUri)) {
    return;
  }

  Utils.deploySolution(fileUri, true, true, auth, output);
}