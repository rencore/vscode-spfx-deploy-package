import * as vscode from 'vscode';

export class Output extends vscode.Disposable {
  private channel: vscode.OutputChannel;

  constructor() {
    super(() => {
      this.channel.dispose();
    });
    this.channel = vscode.window.createOutputChannel('Rencore Deploy SPFx package');
  }

  public show(preserveFocus: boolean = true): void {
    this.channel.show(preserveFocus);
  }

  public write(s: string): void {
    this.channel.appendLine(s);
  }
}