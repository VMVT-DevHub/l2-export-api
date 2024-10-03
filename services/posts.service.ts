'use strict';
import moleculer from 'moleculer';
import { Method, Service } from 'moleculer-decorators';
import DbConnection from '../mixins/database.mixin';
import { CommonFields, CommonPopulates, Table, trimValueSpaces } from '../types';
import { Country } from './countries.service';

interface Fields extends CommonFields {
  id: number;
  name: string;
  code: string;
  abbreviation: string;
  country: Country['id'];
  address: string;
  active: boolean;
}

interface Populates extends CommonPopulates {
  country: Country;
}

export type Post<
  P extends keyof Populates = never,
  F extends keyof (Fields & Populates) = keyof Fields,
> = Table<Fields, Populates, P, F>;

@Service({
  name: 'posts',
  mixins: [
    DbConnection({
      collection: 'postai',
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
        type: 'number',
        primaryKey: true,
        secure: true,
      },
      name: {
        type: 'string',
        columnName: 'postPavad',
        get: trimValueSpaces,
      },
      code: {
        type: 'string',
        columnName: 'postKodas',
        get: trimValueSpaces,
      },
      abbreviation: {
        type: 'string',
        columnName: 'postTrump',
        get: trimValueSpaces,
      },
      country: {
        type: 'string',
        columnName: 'postSalis',
        populate: 'countries.resolve',
      },
      address: {
        type: 'string',
        columnName: 'postAdresas',
        get: trimValueSpaces,
      },
      active: {
        type: 'boolean',
        columnName: 'postAktyvus',
      },
    },
  },
})
export default class extends moleculer.Service {
  @Method
  async seedDB() {
    if (process.env.NODE_ENV !== 'local') return;

    await this.seedCsv('postai', [
      'id',
      'name',
      'code',
      'abbreviation',
      'country',
      'address',
      'active',
    ]);
  }
}
