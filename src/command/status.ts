import * as vscode from 'vscode';
import { Auth, StatusBarItem, Utils } from '../';

export function status(auth: Auth, statusBarItem: StatusBarItem): void {
  if (auth.isConnected) {
    auth
      .getAccessToken()
      .then((accessToken: string): void => {
        const userName: string = Utils.getUserNameFromAccessToken(accessToken);
        vscode.window
          .showInformationMessage(`Connected to ${auth.sharePointUrl} as ${userName}`, 'OK', 'Disconnect')
          .then((action: string | undefined): void => {
            if (action === 'Disconnect') {
              auth.disconnect();
            }
          });
      });
  }
  else {
    vscode.window.showInformationMessage('Not connected to SharePoint', 'OK');
  }
}