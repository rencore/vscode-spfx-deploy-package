import * as vscode from 'vscode';
import { Utils, Auth, Output } from '../';

export function deployGlobal(fileUri: vscode.Uri, auth: Auth, output: Output): void {
  if (!Utils.warnIfNotSppkg(fileUri)) {
    return;
  }

  Utils.deploySolution(fileUri, true, auth, output);
}