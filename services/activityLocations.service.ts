'use strict';
import moleculer from 'moleculer';
import { Method, Service } from 'moleculer-decorators';
import DbConnection from '../mixins/database.mixin';
import { CommonFields, CommonPopulates, Table, trimValueSpaces } from '../types';
import { Country } from './countries.service';

interface Fields extends CommonFields {
  id: number;
  internalId: string;
  companyCode: number;
  type: string;
  name: string;
  isExport: boolean;
  isManufacturer: boolean;
  country: Country['id'];
  address: string;
  registrationNumber: string;
  confirmationNumber: string;
  swift: string;
  details: string;
  isActive: boolean;
  search: string;
  createDate: Date;
  modifyDate: Date;
  modifyUser: string;
  modifyUserName: string;
  groupCode: string;
}

interface Populates extends CommonPopulates {
  country: Country;
}

export type ActivityLocation<
  P extends keyof Populates = never,
  F extends keyof (Fields & Populates) = keyof Fields,
> = Table<Fields, Populates, P, F>;

@Service({
  name: 'activityLocations',
  mixins: [
    DbConnection({
      collection: 'veiklavietes',
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
      internalId: {
        type: 'string',
        columnName: 'vklVid',
        get: trimValueSpaces,
      },
      companyCode: {
        type: 'number',
        columnName: 'vklJar',
      },
      type: {
        type: 'string',
        columnName: 'vklTipas',
        get: trimValueSpaces,
      },
      name: {
        type: 'string',
        columnName: 'vklPavad',
        get: trimValueSpaces,
      },
      isExport: {
        type: 'boolean',
        columnName: 'vklExport',
      },
      isManufacturer: {
        type: 'boolean',
        columnName: 'vklGamint',
      },
      country: {
        type: 'string',
        columnName: 'vklSalis',
        populate: 'countries.resolve',
      },
      address: {
        type: 'string',
        columnName: 'vklAdresas',
        get: trimValueSpaces,
      },
      registrationNumber: {
        type: 'string',
        columnName: 'vklRegNr',
        get: trimValueSpaces,
      },
      confirmationNumber: {
        type: 'string',
        columnName: 'vklPatvirtNr',
        get: trimValueSpaces,
      },
      swift: {
        type: 'string',
        columnName: 'vklSwift',
        get: trimValueSpaces,
      },
      details: {
        type: 'string',
        columnName: 'vklDetales',
        get: trimValueSpaces,
      },
      isActive: {
        type: 'boolean',
        columnName: 'vklAktyvus',
      },
      search: {
        type: 'string',
        columnName: 'vklSearch',
        get: trimValueSpaces,
      },
      createDate: {
        type: 'date',
        columnName: 'vklDateCreated',
      },
      modifyDate: {
        type: 'date',
        columnName: 'vklDateModif',
      },
      modifyUser: {
        type: 'string',
        columnName: 'vklModifUser',
        get: trimValueSpaces,
      },
      modifyUserName: {
        type: 'string',
        columnName: 'vklModifUserName',
        get: trimValueSpaces,
      },
      groupCode: {
        type: 'string',
        columnName: 'vklBandosKodas',
        get: trimValueSpaces,
      },
    },
  },
})
export default class extends moleculer.Service {
  @Method
  async seedDB() {
    if (process.env.NODE_ENV !== 'local') return;

    await this.seedCsv('veiklavietes', [
      'id',
      'internalId',
      'companyCode',
      'type',
      'name',
      'isExport',
      'isManufacturer',
      'country',
      'address',
      'registrationNumber',
      'confirmationNumber',
      'swift',
      'details',
      'isActive',
      'search',
      'createDate',
      'modifyDate',
      'modifyUser',
      'modifyUserName',
      'groupCode',
    ]);
  }
}
