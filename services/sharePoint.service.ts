'use strict';
import { createHmac, timingSafeEqual } from 'crypto';
import _ from 'lodash';
import Moleculer, { Context, RestSchema } from 'moleculer';
import { Action, Method, Service } from 'moleculer-decorators';
import { Readable } from 'stream';
import { throwNotFoundError } from '../types';

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
  created() {
    const secret = process.env.DOWNLOAD_URL_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('DOWNLOAD_URL_SECRET must be set and be at least 32 characters long');
    }
  }

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

      const prefix = 'listItem.fields';
      const filteredItems = (response?.value || []).filter((item: any) => {
        const docType =
          _.get(item, `${prefix}.documentType`) || _.get(item, `${prefix}.DocumentType`);
        return docType === 'Sertifikatas';
      });

      return filteredItems;
    } catch (e) {
      return [];
    }
  }

  @Method
  async getFileInfo(id: string) {
    const token = await this.getToken();
    const url =
      `${this.settings.baseUrl}/${process.env.SHARE_POINT_DRIVE_ID}/items/${id}?` +
      new URLSearchParams({
        select: ['id', 'name', 'file'].join(','),
        expand: 'listItem',
      });

    try {
      return await this.broker.call(
        'http.get',
        {
          url,
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
    } catch {
      return null;
    }
  }

  @Method
  isCertificateFile(item: any) {
    const prefix = 'listItem.fields';
    const docType = _.get(item, `${prefix}.documentType`) || _.get(item, `${prefix}.DocumentType`);
    return docType === 'Sertifikatas';
  }

  @Method
  signDownload(id: string, fileName: string, exp: number) {
    return createHmac('sha256', process.env.DOWNLOAD_URL_SECRET)
      .update(`${id}\n${fileName}\n${exp}`)
      .digest('base64url');
  }

  @Method
  getFileUrl(id: string, fileName: string) {
    const ttl = Number(process.env.DOWNLOAD_URL_TTL_SECONDS || 15 * 60);
    const exp = Math.floor(Date.now() / 1000) + ttl;
    const qs = new URLSearchParams({ exp: String(exp), sig: this.signDownload(id, fileName, exp) });
    return (
      `${process.env.SERVER_HOST}/certificates/download/` +
      `${encodeURIComponent(id)}/${encodeURIComponent(fileName)}?${qs}`
    );
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
      id: { type: 'string', trim: true, min: 3, max: 64, pattern: /^[A-Za-z0-9 _-]+$/ },
      blankNumber: 'string|convert|trim|min:3|max:64',
    },
  })
  async getFiles(ctx: Context<{ id: string; blankNumber: string }>) {
    const { id, blankNumber } = ctx.params;

    // Second factor: throws 404 unless both numbers identify exactly one certificate.
    const certificate: { certificateNumber: string } = await ctx.call('certificates.search', {
      certificateNumber: id,
      blankNumber,
    });

    await this.validateToken();

    const filesInfo: { id: string; name: string; size: number }[] = await this.getFilesInfo(
      certificate.certificateNumber,
    );

    if (!filesInfo.length) {
      return [];
    }

    const data = [];

    for (const f of filesInfo) {
      const url = this.getFileUrl(f.id, f.name);
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
      id: { type: 'string', min: 1, max: 128, pattern: /^[A-Za-z0-9]+$/ },
      // no quotes, slashes or line breaks: the name is echoed into Content-Disposition
      name: { type: 'string', min: 1, max: 255, pattern: /^[^"\\/\r\n]+$/ },
      exp: 'number|convert|integer|positive',
      sig: 'string|min:16|max:128',
    },
  })
  async download(ctx: Context<{ id: string; name: string; exp: number; sig: string }, any>) {
    const { id, name, exp, sig } = ctx.params;

    const expected = this.signDownload(id, name, exp);
    const signatureValid =
      sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));

    if (!signatureValid || exp < Math.floor(Date.now() / 1000)) {
      throwNotFoundError('Certificate file not found.');
    }

    await this.validateToken();

    const token: any = await this.getToken();

    const headers = {
      authorization: token,
    };

    const fileInfo: any = await this.getFileInfo(id);

    if (!fileInfo || !this.isCertificateFile(fileInfo) || fileInfo.name !== name) {
      throwNotFoundError('Certificate file not found.');
    }

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
