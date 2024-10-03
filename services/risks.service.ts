'use strict';
import moleculer from 'moleculer';
import { Method, Service } from 'moleculer-decorators';
import DbConnection from '../mixins/database.mixin';
import { CommonFields, CommonPopulates, Table, trimValueSpaces } from '../types';

interface Fields extends CommonFields {
  id: number;
  name: string;
  min: number;
  max: number;
  check: number;
}

interface Populates extends CommonPopulates {}

export type Risk<
  P extends keyof Populates = never,
  F extends keyof (Fields & Populates) = keyof Fields,
> = Table<Fields, Populates, P, F>;

@Service({
  name: 'risks',
  mixins: [
    DbConnection({
      collection: 'rizikos',
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
        columnName: 'rizId',
        primaryKey: true,
        secure: true,
      },
      name: {
        type: 'string',
        columnName: 'rizName',
        get: trimValueSpaces,
      },
      min: {
        type: 'number',
        columnName: 'rizMin',
      },
      max: {
        type: 'string',
        columnName: 'rizMax',
      },
      check: {
        type: 'string',
        columnName: 'rizCheck',
      },
    },
  },
})
export default class extends moleculer.Service {
  @Method
  async seedDB() {
    if (process.env.NODE_ENV !== 'local') return;

    await this.seedCsv('rizikos', ['id', 'name', 'min', 'max', 'check']);
  }
}
