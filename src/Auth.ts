import * as vscode from 'vscode';
import { AuthenticationContext, TokenResponse, ErrorResponse, UserCodeInfo } from 'adal-node';
import { Output, StatusBarItem } from '.';

export class Auth extends vscode.Disposable {
  private ctx: AuthenticationContext;
  private readonly appId: string = 'be278e09-27a8-47ac-91fe-27f05350b7d8';
  public sharePointUrl: string | undefined;
  private accessToken: string | undefined;
  private accessTokenExpiresOn: string | undefined;
  private refreshToken: string | undefined;

  public get isConnected(): boolean {
    return !!this.accessToken;
  }

  constructor(private output: Output, private statusBarItem: StatusBarItem) {
    super(() => {
      (this.ctx as any) = undefined;
    });
    this.ctx = new AuthenticationContext('https://login.microsoftonline.com/common');
  }

  public getAccessToken(): Promise<string> {
    return new Promise<string>((resolve: (accessToken: string) => void, reject: (error: any) => void): void => {
      if (this.accessToken && this.accessTokenExpiresOn) {
        const expiresOn: Date = new Date(this.accessTokenExpiresOn);
        if (expiresOn > new Date()) {
          resolve(this.accessToken);
          return;
        }
        else {
          this.ctx.acquireTokenWithRefreshToken(this.refreshToken as string, this.appId, this.sharePointUrl as string, (error: Error, response: TokenResponse | ErrorResponse): void => {
            if (error) {
              reject((response && (response as any).error_description) || error.message);
              return;
            }

            const token: TokenResponse = <TokenResponse>response;
            this.accessToken = token.accessToken;
            this.accessTokenExpiresOn = token.expiresOn as string;
            this.refreshToken = token.refreshToken;

            resolve(this.accessToken);
          });
        }
      }

      ((): Thenable<string | undefined> => {
        let sharePointUrl: string | undefined = vscode.workspace.getConfiguration('rencoreSpfxDeploy').get('sharePointUrl');
        if (sharePointUrl) {
          return Promise.resolve(sharePointUrl);
        }

        return vscode.window.showInputBox({
          ignoreFocusOut: true,
          prompt: 'URL of your SharePoint tenant',
          placeHolder: 'https://contoso.sharepoint.com'
        });
      })()
        .then((sharePointUrl: string | undefined): void => {
          if (!sharePointUrl) {
            reject('Please specify SharePoint URL');
          }

          this.sharePointUrl = sharePointUrl;

          this.ctx.acquireUserCode(this.sharePointUrl as string, this.appId, 'en-us', (error: Error, response: UserCodeInfo): void => {
            if (error) {
              reject((response && (response as any).error_description) || error.message);
              return;
            }

            this.output.write(`- ${response.message}`);
            vscode.window.showInformationMessage(response.message);

            this.ctx.acquireTokenWithDeviceCode(this.sharePointUrl as string, this.appId as string, response,
              (error: Error, response: TokenResponse | ErrorResponse): void => {
                if (error) {
                  reject((response && (response as any).error_description) || error.message);
                  return;
                }

                const token: TokenResponse = <TokenResponse>response;
                this.accessToken = token.accessToken;
                this.accessTokenExpiresOn = token.expiresOn as string;
                this.refreshToken = token.refreshToken;

                this.statusBarItem.connected = true;
                resolve(this.accessToken);
              });
          });
        }, (error: any): void => {
          this.statusBarItem.connected = false;
          reject(error);
        });
    });
  }

  public disconnect(): void {
    this.sharePointUrl = undefined;
    this.accessToken = undefined;
    this.accessTokenExpiresOn = undefined;
    this.refreshToken = undefined;

    this.statusBarItem.connected = false;
  }
}