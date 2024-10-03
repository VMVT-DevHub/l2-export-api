'use strict';
import moleculer from 'moleculer';
import { Method, Service } from 'moleculer-decorators';
import DbConnection from '../mixins/database.mixin';
import { CommonFields, CommonPopulates, Table, trimValueSpaces } from '../types';

interface Fields extends CommonFields {
  id: number;
  group: string;
  number: number;
  title: string;
  description: string;
}

interface Populates extends CommonPopulates {}

export type Lookup<
  P extends keyof Populates = never,
  F extends keyof (Fields & Populates) = keyof Fields,
> = Table<Fields, Populates, P, F>;

@Service({
  name: 'lookups',
  mixins: [
    DbConnection({
      collection: 'lookup',
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
      group: {
        type: 'string',
        columnName: 'lkpGroup',
        get: trimValueSpaces,
      },
      number: {
        type: 'number',
        columnName: 'lkpNum',
      },
      title: {
        type: 'string',
        columnName: 'lkpTitle',
        get: trimValueSpaces,
      },
      description: {
        type: 'string',
        columnName: 'lkpDescr',
        get: trimValueSpaces,
      },
    },
  },
})
export default class extends moleculer.Service {
  @Method
  async seedDB() {
    if (process.env.NODE_ENV !== 'local') return;

    await this.seedCsv('lookup', ['id', 'group', 'number', 'title', 'description']);
  }
}
