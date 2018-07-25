import * as vscode from 'vscode';

export class StatusBarItem extends vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;

  public set connected(c: boolean) {
    this.statusBarItem.text = c ? '$(globe) Connected' : '$(circle-slash) Disconnected';
    this.statusBarItem.tooltip = `Rencore Deploy SPFx package extension ${(c ? '' : 'not ')}connected to SharePoint`;
  }

  constructor() {
    super(() => {
      this.statusBarItem.dispose();
    });

    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);
    this.statusBarItem.command = 'rencoreSpfxDeploy.status';
    this.connected = false;
    this.statusBarItem.show();
  }
}