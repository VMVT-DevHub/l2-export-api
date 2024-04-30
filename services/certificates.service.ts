'use strict';
import moleculer, { Context } from 'moleculer';
import { Action, Method, Service } from 'moleculer-decorators';
import DbConnection, { PopulateHandlerFn } from '../mixins/database.mixin';
import { CommonFields, throwNotFoundError } from '../types';
import { faker } from '@faker-js/faker';

export interface Certificate extends CommonFields {
  id: number;
  certificateNumber: string;
  status: string;
  date: Date;
  exportCompany: string;
  importCompany: string;
  importCountry: string;
  sealNumber: string;
  territorialNumber: string;
  notes: string;
  transportNumber: string;
  grantedNumber: number;
  departurePVP: string;
  signedBy: string;
}

@Service({
  name: 'certificates',
  mixins: [
    DbConnection({
      collection: 'zur123',
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
        columnType: 'integer',
        primaryKey: true,
        secure: true,
      },
      certificateNumber: {
        type: 'string',
        columnName: 'sertif',
      },
      status: {
        type: 'string',
        columnName: 'status',
      },
      date: {
        type: 'date',
        columnName: 'data',
      },
      exportCompany: {
        type: 'string',
        columnName: 'fir',
      },
      exportCountry: {
        virtual: true,
        type: 'string',
        get: () => 'Lietuva',
      },
      importCompany: {
        type: 'string',
        columnName: 'sritis',
      },
      importCountry: {
        type: 'string',
        columnName: 'sal',
      },
      sealNumber: {
        type: 'string',
        columnName: 'plomba',
      },
      territorialNumber: {
        type: 'string',
        columnName: 'raj',
      },
      notes: {
        type: 'string',
        columnName: 'pastaba',
      },
      transportNumber: {
        type: 'string',
        columnName: 'tranr',
      },
      grantedNumber: { type: 'number', columnName: 'enr' },
      departurePVP: { type: 'string', columnName: 'pos' },
      signedBy: {
        type: 'string',
        columnName: 'paras',
      },
      loads: {
        type: 'array',
        readonly: true,
        virtual: true,
        default: () => [],
        populate: {
          keyField: 'id',
          handler: PopulateHandlerFn('loads.populateByProp'),
          params: {
            queryKey: 'certificate',
            mappingMulti: true,
          },
        },
      },
      files: {
        type: 'array',
        readonly: true,
        virtual: true,
        default: () => [],
        populate: async (ctx: Context, _values: Request[], entities: Certificate[]) => {
          return await Promise.all(
            entities.map(async (entity) => {
              const files = await ctx.call('sharepoint.getFiles', { id: entity.id });
              return files;
            }),
          );
        },
      },
    },
  },
})
export default class CertificateService extends moleculer.Service {
  @Action({
    rest: 'GET /:certificateNumber',
    params: {
      certificateNumber: 'string',
    },
  })
  async getCertificate(ctx: Context<{ certificateNumber: string }>) {
    const { certificateNumber } = ctx.params;

    // Calculate the date from one year ago
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const certificate: Certificate = await this.findEntity(ctx, {
      populate: 'loads',
      query: {
        certificateNumber,
        date: {
          $lte: new Date(),
          $gte: oneYearAgo,
        },
      },
    });

    if (!certificate) {
      return throwNotFoundError('Certificate not found.');
    }

    return certificate;
  }

  @Method
  async seedDB() {
    if (process.env.NODE_ENV !== 'local') return;

    const status = ['Galiojantis', 'Negaliojantis'];
    const generateSeedData = () => {
      const data = [];
      for (let i = 0; i < 10; i++) {
        data.push({
          id: i + 1,
          certificateNumber: 'A' + faker.number.int({ min: 100000, max: 999999 }),
          status: status[Math.floor(Math.random() * status.length)],
          date: faker.date.past({ years: 1 }),
          exportCompany: faker.company.name(),
          importCompany: faker.company.name(),
          importCountry: faker.location.country(),
          sealNumber: faker.number.int({ min: 1000000, max: 9999999 }),
          territorialNumber: faker.location.city() + ' MPV',
          notes: faker.commerce.productName(),
          transportNumber: `${faker.number.int({ min: 1000000, max: 9999999 })}/${faker.number.int({
            min: 1000000,
            max: 9999999,
          })}`,
          grantedNumber: faker.number.int({ min: 10000, max: 99999 }),
          departurePVP: faker.lorem.word(),
          signedBy: faker.person.fullName(),
        });
      }
      return data;
    };
    const seedData = generateSeedData();
    await this.createEntities(null, seedData);
  }
}
