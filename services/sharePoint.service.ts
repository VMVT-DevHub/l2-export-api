'use strict';
import Moleculer, { Context, RestSchema } from 'moleculer';
import { Action, Method, Service } from 'moleculer-decorators';
import { Readable } from 'stream';

export function toReadableStream(fetchReadable: any): NodeJS.ReadableStream {
  if (!fetchReadable) return;
  return new Readable({
    async read() {
      if (!fetchReadable?.read) {
        this.emit('done');
        return;
      }

      const { value, done } = await fetchReadable.read();
      if (done) {
        this.emit('end');
        return;
      }

      this.push(value);
    },
  });
}

@Service({
  name: 'sharepoint',
  settings: {
    baseUrl: 'https://graph.microsoft.com/v1.0/drives',
  },
})
export default class extends Moleculer.Service {
  @Method
  async authenticate() {
    const url = `https://login.microsoftonline.com/${process.env.SHARE_POINT_TENANT_ID}/oauth2/v2.0/token`;

    const postData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SHARE_POINT_CLIENT_ID,
      client_secret: process.env.SHARE_POINT_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
    });

    const response: any = await this.broker.call(
      'http.post',
      {
        url: url,
        opt: {
          responseType: 'json',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: postData.toString(),
        },
      },
      {
        timeout: 0,
      },
    );

    const { token_type, expires_in, access_token } = response;

    await this.broker.cacher.set(
      `${this.name}.token`,
      { token: `${token_type} ${access_token}` },
      expires_in - 60,
    );
  }

  @Method
  async getToken() {
    const data = await this.broker.cacher.get(`${this.name}.token`);
    return data?.token;
  }

  @Method
  async getFilesInfo(id: string) {
    const token = await this.getToken();

    const url =
      `${this.settings.baseUrl}/${process.env.SHARE_POINT_DRIVE_ID}/root:/${id}:/children?` +
      new URLSearchParams({
        select: ['id', 'name', 'size', 'file'].join(','),
        expand: 'listItem',
      });

    try {
      const response: any = await this.broker.call(
        'http.get',
        {
          url: url,
          opt: {
            responseType: 'json',
            headers: {
              'Content-Type': 'application/json',
              Authorization: token,
            },
          },
        },
        {
          timeout: 0,
        },
      );

      const filteredItems = (response?.value || []).filter(
        (item: any) => item?.listItem?.fields?.documentType === 'Sertifikatas',
      );

      return filteredItems;
    } catch (e) {
      return [];
    }
  }

  @Method
  getFileUrl(id: string, fileName: string) {
    return `${process.env.SERVER_HOST}/certificates/download/${id}/${fileName}`;
  }

  @Method
  async validateToken() {
    const sharePointToken = await this.getToken();

    if (!sharePointToken) {
      await this.authenticate();
    }
  }

  @Action({
    rest: <RestSchema>{
      method: 'GET',
      basePath: '/certificates',
      path: '/files/:id',
    },
    params: {
      id: 'string',
    },
  })
  async getFiles(ctx: Context<{ id: string }>) {
    await this.validateToken();

    const id = ctx.params.id;

    const filesInfo: { id: string; name: string; size: number }[] = await this.getFilesInfo(id);

    if (!filesInfo.length) {
      return [];
    }

    const data = [];

    for (const f of filesInfo) {
      const url = await this.getFileUrl(f.id, f.name);
      data.push({
        url,
        name: f.name,
        size: f.size,
      });
    }

    return data;
  }

  @Action({
    rest: <RestSchema>{
      method: 'GET',
      basePath: '/certificates',
      path: '/download/:id/:name',
    },
    params: {
      id: 'string',
      name: 'string',
    },
  })
  async download(ctx: Context<{ id: string; name: string }, any>) {
    await this.validateToken();

    const token: any = await this.getToken();

    const headers = {
      authorization: token,
    };

    const { id, name } = ctx.params;

    const url = `${this.settings.baseUrl}/${process.env.SHARE_POINT_DRIVE_ID}/items/${id}/content`;

    return fetch(url, { headers })
      .then((response) => {
        ctx.meta.$responseType = response.headers.get('Content-Type');
        ctx.meta.$statusCode = response.status;
        ctx.meta.$responseHeaders = {
          'Content-Disposition': `attachment; filename="${name}"`,
        };
        return response;
      })
      .then((response) => response?.body?.getReader?.())
      .then((stream) => toReadableStream(stream))
      .catch((err) => this.broker.logger.error(err));
  }
}
