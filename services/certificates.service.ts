'use strict';
import moleculer, { Context } from 'moleculer';
import { Action, Method, Service } from 'moleculer-decorators';
import DbConnection, { PopulateHandlerFn } from '../mixins/database.mixin';
import { CommonFields, throwNotFoundError, trimValueSpaces } from '../types';
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
      enr: {
        type: 'number',
        columnName: 'enr',
      },
      year: {
        type: 'number',
        columnName: 'year',
      },
      certificateNumber: {
        type: 'string',
        columnName: 'sertif',
        get: trimValueSpaces,
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
        get: trimValueSpaces,
      },
      exportCountry: {
        virtual: true,
        type: 'string',
        get: () => 'Lietuva',
      },
      importCompany: {
        type: 'string',
        columnName: 'sritis',
        get: trimValueSpaces,
      },
      importCountry: {
        type: 'string',
        columnName: 'sal',
        get: trimValueSpaces,
      },
      sealNumber: {
        type: 'string',
        columnName: 'plomba',
        get: trimValueSpaces,
      },
      territorialNumber: {
        type: 'string',
        columnName: 'raj',
        get: trimValueSpaces,
      },
      notes: {
        type: 'string',
        columnName: 'pastaba',
        get: trimValueSpaces,
      },
      transportNumber: {
        type: 'string',
        columnName: 'tranr',
        get: trimValueSpaces,
      },
      grantedNumber: { type: 'number', columnName: 'enr' },
      departurePVP: { type: 'string', columnName: 'pos', get: trimValueSpaces },
      signedBy: {
        type: 'string',
        columnName: 'paras',
        get: trimValueSpaces,
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
    rest: 'GET /search',
    params: {
      certificateNumber: 'string|convert|min:3',
      enr: 'string|convert',
      year: 'string|convert|optional',
    },
  })
  async search(ctx: Context<{ certificateNumber: string; year?: string; enr: string }>) {
    const { certificateNumber, year, enr } = ctx.params;

    // it's really messy. Spaces can be found anywhere (except in cetirifacte number (without letters))
    const query: any = {
      certificateNumber: {
        $raw: {
          condition: 'sertif ilike ?',
          bindings: [`%${certificateNumber}%`],
        },
      },
      enr,
    };

    if (year) {
      query.year = year;
    }

    const certificates: Certificate[] = await this.findEntities(ctx, {
      populate: 'loads',
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

    const status = ['Galiojantis', 'Negaliojantis'];

    const generateSeedData = () => {
      const data = [];
      for (let i = 0; i < 10; i++) {
        const randomNumber = faker.number.int({ min: 100, max: 999999 });
        const randomDate = faker.date.past({ years: 1 });
        const randomYear = new Date(randomDate).getFullYear();
        const randomPrefixes = ['', 'LT', 'A', 'B', 'EXPORT.LT.'];
        const randomPrefix = randomPrefixes[Math.floor(Math.random() * randomPrefixes.length)];

        const optionalSpace = Math.floor(Math.random() * 2) < 1 ? '' : ' ';
        const certificateNumber = `${randomPrefix}${optionalSpace}${randomNumber}`;

        data.push({
          id: i + 1,
          certificateNumber,
          status: status[Math.floor(Math.random() * status.length)],
          date: randomDate,
          number: randomNumber,
          year: randomYear,
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
