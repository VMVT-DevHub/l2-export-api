'use strict';
import moleculer, { Context } from 'moleculer';
import { Action, Method, Service } from 'moleculer-decorators';
import DbConnection from '../mixins/database.mixin';
import { throwNotFoundError, trimValueSpaces } from '../types';

interface Certificate {
  id: number;
  certificateNumber: string;
  exporter: {
    id: number;
    name: string;
  } | null;
  importCountry: {
    id: number;
    name: string;
  } | null;
  importPost: {
    id: number;
    name: string;
  } | null;
  importReceiver: string;
  status: string;
  issueDate: string;
  blankNumber: string;
  exportCountry: string;
  post: {
    id: number;
    name: string;
  } | null;
  postOther: string;
  issueEmail: string;
  issueName: string;
  issueDepartment: string;
  fileCount: number;
  transporters: Array<{
    id: number;
    type: {
      id: number | null;
      title: string | null;
    } | null;
    typeOther: string | null;
    number: string;
  }> | null;
  loads: Array<{
    id: number;
    type: {
      id: number | null;
      title: string | null;
    } | null;
    typeOther: string | null;
    number: string;
  }> | null;
  products: Array<{
    id: number;
    productName: string;
    productLevel1: string;
    productLevel1Name: string;
    productLevel2: string;
    productLevel2Name: string;
    productLevel3: string;
    productLevel3Name: string;
    productLevel4: string;
    productLevel4Name: string;
    manufacturer: { id: number; name: string };
    unit: string;
    quantity: number;
    packaging: string;
  }> | null;
}

@Service({
  name: 'certificates',
  mixins: [
    DbConnection({
      collection: 'certificates',
      createActions: {
        create: false,
        update: false,
        remove: false,
        createMany: false,
        removeAllEntities: false,
      },
      rest: null,
    }),
  ],
  settings: {
    fields: {
      id: {
        type: 'string',
        primaryKey: true,
        secure: true,
      },
      exportCountry: {
        virtual: true,
        get: () => {
          return 'Lietuva';
        },
      },
      certificateNumber: {
        type: 'string',
        get: trimValueSpaces,
      },
      exporter: {
        type: 'object',
        default: {},
      },

      importCountry: {
        type: 'object',
        default: {},
      },

      importPost: {
        type: 'string',
      },
      importReceiver: {
        type: 'string',
        get: trimValueSpaces,
      },
      status: {
        type: 'string',
        get: trimValueSpaces,
      },
      issueDate: {
        type: 'string',
      },
      blankNumber: {
        type: 'string',
        get: trimValueSpaces,
      },
      post: {
        type: 'object',
      },

      postOther: {
        type: 'string',
        get: trimValueSpaces,
      },
      issueEmail: {
        type: 'string',
        get: trimValueSpaces,
      },
      issueName: {
        type: 'string',
        get: trimValueSpaces,
      },
      issueDepartment: {
        type: 'string',
        get: trimValueSpaces,
      },
      fileCount: {
        type: 'number',
      },
      transporters: {
        type: 'array',
        default: [],
      },
      loads: {
        type: 'array',
        default: [],
      },
      products: {
        type: 'array',
        default: [],
      },
    },
  },
})
export default class extends moleculer.Service {
  @Action({
    rest: 'GET /search',
    params: {
      certificateNumber: 'string|convert|min:3',
      year: 'string|convert|optional',
      blankNumber: 'string|convert|optional',
    },
  })
  async search(ctx: Context<{ certificateNumber: string; year?: string; blankNumber?: number }>) {
    const { certificateNumber, year, blankNumber } = ctx.params;

    // it's really messy. Spaces can be found anywhere (except in cetirifacte number (without letters))
    const query: any = {
      certificateNumber: {
        $ilike: `%${certificateNumber}%`,
      },
    };

    if (blankNumber) {
      query.blankNumber = {
        $ilike: `%${blankNumber}%`,
      };
    }

    if (year) {
      query.year = {
        $raw: {
          condition: "date_part('year', issue_date::date) = ?",
          bindings: [year],
        },
      };
    }
    const certificates: Certificate[] = await this.findEntities(ctx, {
      query,
    });

    if (!certificates?.length) {
      return throwNotFoundError('Certificate not found.');
    } else if (certificates.length > 1) {
      return throwNotFoundError('More than 1 certificate with same params.');
    }

    return certificates[0];
  }

  @Method
  async seedDB() {
    if (process.env.NODE_ENV !== 'local') return;

    await this.seedCsv('certificates', [
      'id',
      'certificateNumber',
      'exporter',
      'importCountry',
      'importPost',
      'importReceiver',
      'status',
      'issueDate',
      'blankNumber',
      'post',
      'postOther',
      'issueEmail',
      'issueName',
      'issueDepartment',
      'fileCount',
      'transporters',
      'loads',
      'products',
    ]);
  }
}
