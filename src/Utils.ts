import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as request from 'request-promise-native';
import { Auth, Output } from './';

export class Utils {
  public static warnIfNotSppkg(fileUri: vscode.Uri): boolean {
    if (path.extname(fileUri.fsPath) !== '.sppkg') {
      vscode.window.showErrorMessage(`File '${path.basename(fileUri.path)}' is not a SharePoint Framework solution package`);
      return false;
    }

    return true;
  }

  private static getRequestDigestForSite(siteUrl: string, auth: Auth): Promise<string> {
    return new Promise<string>((resolve: (requestDigest: string) => void, reject: (error: any) => void): void => {
      auth
        .getAccessToken()
        .then((accessToken: string): request.RequestPromise => {
          const requestOptions: any = {
            url: `${siteUrl}/_api/contextinfo`,
            headers: {
              authorization: `Bearer ${accessToken}`,
              accept: 'application/json;odata=nometadata',
            },
            json: true
          };

          console.log(requestOptions);

          return request.post(requestOptions);
        })
        .then((res: { FormDigestValue: string; }): void => {
          console.log(res);

          resolve(res.FormDigestValue);
        }, (error: any): void => {
          reject(error);
        });
    });
  }

  private static getTenantAppCatalogUrl(auth: Auth): Promise<string> {
    return new Promise<string>((resolve: (tenantAppCatalogUrl: string) => void, reject: (error: any) => void): void => {
      auth
        .getAccessToken()
        .then((accessToken: string): request.RequestPromise => {
          const requestOptions: any = {
            url: `${auth.sharePointUrl}/_api/SP_TenantSettings_Current`,
            headers: {
              authorization: `Bearer ${accessToken}`,
              accept: 'application/json;odata=nometadata',
            },
            json: true
          };

          console.log(requestOptions);

          return request.get(requestOptions);
        })
        .then((res: { CorporateCatalogUrl: string; }): void => {
          console.log(res);

          if (res.CorporateCatalogUrl) {
            resolve(res.CorporateCatalogUrl);
          }
          else {
            reject(`Couldn't locate tenant app catalog`);
          }
        }, (error: any): void => {
          reject(error);
        });
    });
  }

  private static addSolutionToCatalog(fileUri: vscode.Uri, appCatalogUrl: string, tenantAppCatalog: boolean, auth: Auth, output: Output): Promise<string> {
    return new Promise<string>((resolve: (solutionId: string) => void, reject: (error: any) => void): void => {
      let accessToken: string = '';
      auth
        .getAccessToken()
        .then((at: string): Promise<string> => {
          output.write(`- Retrieving request digest for ${appCatalogUrl}...`);
          accessToken = at;
          return Utils.getRequestDigestForSite(appCatalogUrl, auth);
        })
        .then((requestDigest: string): request.RequestPromise => {
          const solutionFileName: string = path.basename(fileUri.fsPath).toLowerCase();
          output.write(`- Adding solution ${solutionFileName} to the app catalog ${appCatalogUrl}...`);
          const requestOptions: any = {
            url: `${appCatalogUrl}/_api/web/${(tenantAppCatalog ? 'tenantappcatalog' : 'sitecollectionappcatalog')}/Add(overwrite=true, url='${solutionFileName}')`,
            headers: {
              authorization: `Bearer ${accessToken}`,
              accept: 'application/json;odata=nometadata',
              'X-RequestDigest': requestDigest,
              binaryStringRequestBody: 'true'
            },
            body: fs.readFileSync(fileUri.fsPath)
          };

          console.log(requestOptions);

          return request.post(requestOptions);
        })
        .then((res: string): void => {
          console.log(res);

          const solution: { UniqueId: string } = JSON.parse(res);
          resolve(solution.UniqueId);
        }, (error: any): void => {
          reject(error);
        });
    });
  }

  public static deploySolution(fileUri: vscode.Uri, tenantAppCatalog: boolean, skipFeatureDeployment: boolean, auth: Auth, output: Output): void {
    output.show();
    output.write('Deploying solution package...');
    let accessToken: string = '';
    let appCatalogUrl: string = '';
    let solutionId: string = '';
    auth
      .getAccessToken()
      .then((at: string): Promise<string> | Thenable<string | undefined> => {
        accessToken = at;
        if (tenantAppCatalog) {
          return Utils.getTenantAppCatalogUrl(auth);
        }
        else {
          return vscode.window.showInputBox({
            ignoreFocusOut: true,
            prompt: 'URL of your SharePoint site collection app catalog',
            placeHolder: 'https://contoso.sharepoint.com/site/marketing'
          });
        }
      })
      .then((catalogUrl: string | undefined): Promise<string> => {
        console.log(catalogUrl);

        if (!catalogUrl) {
          if (tenantAppCatalog) {
            throw 'Unable to determine tenant app catalog URL';
          }
          else {
            throw 'Please specify the URL of the site collection app catalog';
          }
        }

        appCatalogUrl = catalogUrl;

        return Utils.addSolutionToCatalog(fileUri, appCatalogUrl, tenantAppCatalog, auth, output);
      })
      .then((sid: string): Promise<string> => {
        solutionId = sid;
        output.write(`- Retrieving request digest for ${appCatalogUrl}...`);
        return Utils.getRequestDigestForSite(appCatalogUrl, auth);
      })
      .then((requestDigest: string): request.RequestPromise => {
        output.write(`- Deploying solution to ${skipFeatureDeployment ? 'all sites' : 'the app catalog'}...`);
        const requestOptions: any = {
          url: `${appCatalogUrl}/_api/web/${(tenantAppCatalog ? 'tenantappcatalog' : 'sitecollectionappcatalog')}/AvailableApps/GetById('${solutionId}')/deploy`,
          headers: {
            authorization: `Bearer ${accessToken}`,
            accept: 'application/json;odata=nometadata',
            'content-type': 'application/json;odata=nometadata;charset=utf-8',
            'X-RequestDigest': requestDigest
          },
          body: { 'skipFeatureDeployment': skipFeatureDeployment },
          json: true
        };

        console.log(requestOptions);

        return request.post(requestOptions);
      })
      .then((res: any): void => {
        console.log(res);

        output.write('DONE');
        output.write('');
      }, (error: any): void => {
        console.log(error);

        let message = error;

        if (typeof error === 'string') {
          error = JSON.parse(error);
        }

        if (typeof error.error === 'string') {
          error = JSON.parse(error.error);
          if (error['odata.error']) {
            message = error['odata.error'].message.value;
          }
        }
        else {
          if (error.error &&
            error.error['odata.error']) {
            message = error.error['odata.error'].message.value;
          }
        }

        output.write(`Error: ${message}`);
        output.write('');
        vscode.window.showErrorMessage(`The following error has occurred while deploying the solution package to the app catalog: ${message}`);
      });
  }

  public static getUserNameFromAccessToken(accessToken: string): string {
    let userName: string = '';

    if (!accessToken || accessToken.length === 0) {
      return userName;
    }

    const chunks = accessToken.split('.');
    if (chunks.length !== 3) {
      return userName;
    }

    const tokenString: string = Buffer.from(chunks[1], 'base64').toString();
    try {
      const token: any = JSON.parse(tokenString);
      userName = token.upn;
    }
    catch {
    }

    return userName;
  }
}