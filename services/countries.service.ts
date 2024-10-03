'use strict';
import moleculer from 'moleculer';
import { Method, Service } from 'moleculer-decorators';
import DbConnection from '../mixins/database.mixin';
import { CommonFields, CommonPopulates, Table, trimValueSpaces } from '../types';

interface Fields extends CommonFields {
  id: string;
  name: string;
  iso: string;
}

interface Populates extends CommonPopulates {}

export type Country<
  P extends keyof Populates = never,
  F extends keyof (Fields & Populates) = keyof Fields,
> = Table<Fields, Populates, P, F>;

@Service({
  name: 'countries',
  mixins: [
    DbConnection({
      collection: 'salys',
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
        columnType: 'string',
        primaryKey: true,
        secure: true,
      },
      name: {
        type: 'string',
        columnName: 'salPavad',
        get: trimValueSpaces,
      },
      iso: {
        type: 'string',
        columnName: 'salIso2',
        get: trimValueSpaces,
      },
    },
  },
})
export default class extends moleculer.Service {
  @Method
  async seedDB() {
    if (process.env.NODE_ENV !== 'local') return;

    await this.seedCsv('salys', ['id', 'name', 'iso']);
  }
}
