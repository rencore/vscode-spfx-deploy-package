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

  public static getRequestDigest(auth: Auth): Promise<string> {
    return Utils.getRequestDigestForSite(auth.sharePointUrl as string, auth);
  }

  public static getRequestDigestForSite(siteUrl: string, auth: Auth): Promise<string> {
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

  public static getTenantAppCatalogUrl(auth: Auth): Promise<string> {
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

  private static addSolutionToCatalog(fileUri: vscode.Uri, auth: Auth, output: Output): Promise<string> {
    return new Promise<string>((resolve: (solutionId: string) => void, reject: (error: any) => void): void => {
      let accessToken: string = '';
      auth
        .getAccessToken()
        .then((at: string): Promise<string> => {
          output.write(`- Retrieving request digest for ${auth.sharePointUrl}...`);
          accessToken = at;
          return Utils.getRequestDigest(auth);
        })
        .then((requestDigest: string): request.RequestPromise => {
          const solutionFileName: string = path.basename(fileUri.fsPath).toLowerCase();
          output.write(`- Adding solution ${solutionFileName} to the tenant app catalog...`);
          const requestOptions: any = {
            url: `${auth.sharePointUrl}/_api/web/tenantappcatalog/Add(overwrite=true, url='${solutionFileName}')`,
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

  public static deploySolution(fileUri: vscode.Uri, skipFeatureDeployment: boolean, auth: Auth, output: Output): void {
    output.show();
    output.write('Deploying solution package...');
    let accessToken: string = '';
    let tenantAppCatalogUrl: string = '';
    let solutionId: string = '';
    auth
      .getAccessToken()
      .then((at: string): Promise<string> => {
        accessToken = at;
        return Utils.addSolutionToCatalog(fileUri, auth, output);
      })
      .then((sid: string): Promise<string> => {
        solutionId = sid;
        output.write('- Retrieving information about the tenant app catalog...');
        return Utils.getTenantAppCatalogUrl(auth);
      })
      .then((appCatalogUrl: string): Promise<string> => {
        tenantAppCatalogUrl = appCatalogUrl;
        output.write(`- Retrieving request digest for ${tenantAppCatalogUrl}...`);
        return Utils.getRequestDigestForSite(tenantAppCatalogUrl, auth);
      })
      .then((requestDigest: string): request.RequestPromise => {
        output.write(`- Deploying solution to ${skipFeatureDeployment ? 'all sites' : 'the tenant app catalog'}...`);
        const requestOptions: any = {
          url: `${tenantAppCatalogUrl}/_api/web/tenantappcatalog/AvailableApps/GetById('${solutionId}')/deploy`,
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

        if (error.error &&
          error.error['odata.error']) {
          message = error.error['odata.error'].message.value;
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