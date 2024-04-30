'use strict';
import moleculer from 'moleculer';
import { Method, Service } from 'moleculer-decorators';
import DbConnection from '../mixins/database.mixin';
import { CommonFields, CommonPopulates, Table } from '../types';
import { Certificate } from './certificates.service';
import { faker } from '@faker-js/faker';

interface Fields extends CommonFields {
  id: number;
  code: string;
  name: string;
  amount: number;
  manufacturer: string;
  packagesNumber: number;
  originCountryCertificate: string;
  certificate: Certificate['id'];
}

interface Populates extends CommonPopulates {
  certificate: Certificate;
}

export type SportsBasesSpacesTypesAndFieldsValues<
  P extends keyof Populates = never,
  F extends keyof (Fields & Populates) = keyof Fields,
> = Table<Fields, Populates, P, F>;

@Service({
  name: 'loads',
  mixins: [
    DbConnection({
      collection: 'zur1p',
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
      code: {
        type: 'string',
        columnName: 'kkod',
      },
      name: {
        type: 'string',
        columnName: 'kro',
      },
      amount: {
        type: 'number',
        columnName: 'kiek',
      },
      manufacturer: {
        type: 'string',
        columnName: 'gamintojas',
      },
      packagesNumber: {
        type: 'number',
        columnName: 'pak',
      },
      originCountryCertificate: {
        type: 'string',
        columnName: 'kilsert',
      },
      certificate: {
        type: 'number',
        columnName: 'lid',
        populate: {
          action: 'certificates.resolve',
        },
      },
    },
  },
})
export default class LoadService extends moleculer.Service {
  @Method
  async seedDB() {
    const generateSeedData = (certificate: number, id: number) => ({
      id,
      code: faker.number.int({ min: 1, max: 1000 }),
      name: faker.commerce.productName(),
      amount: faker.number.int({ max: 100 }),
      manufacturer: faker.company.name(),
      packagesNumber: Math.floor(Math.random() * 100) + 1,
      originCountryCertificate: faker.number.int({ min: 1000000, max: 9999999 }),
      certificate,
    });
    await this.broker.waitForServices(['certificates']);
    const seedData = [];
    const certificates: Certificate[] = await this.broker.call('certificates.find');
    for (const c of certificates) {
      const randomNum = faker.number.int({ max: 10 });
      for (let i = 0; i <= randomNum; i++) {
        const seed = generateSeedData(c.id, seedData.length + 1);
        seedData.push(seed);
      }
    }
    await this.createEntities(null, seedData);
  }
}
