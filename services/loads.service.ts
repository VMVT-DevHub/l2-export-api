'use strict';
import moleculer from 'moleculer';
import { Method, Service } from 'moleculer-decorators';
import DbConnection, { PopulateHandlerFn } from '../mixins/database.mixin';
import { CommonFields, CommonPopulates, DEFAULT_SCOPES, Table, trimValueSpaces } from '../types';
import { Certificate } from './certificates.service';
import { Lookup } from './lookups.service';
import { faker } from '@faker-js/faker';

interface Fields {
  id: number;
  certificate: Certificate['id']; // krovCertId
  sealNumber: string; // krovPlomba
  transportType: Lookup['id']; // krovTransportoTipas
  transportNumber: string; // krovKonteinerioNr
  details: string; // krovDetales
  createDate: Date; // krovDateCreated
  modifyDate: Date; // krovDateModif
  modifyUser: string; // krovModifUser
  modifyUserName: string; // krovModifUserName
  isDeleted: boolean; // krovModifDelete
}

interface Populates {
  certificate: Certificate;
  transportType: Lookup;
}

export type Load<
  P extends keyof Populates = never,
  F extends keyof (Fields & Populates) = keyof Fields,
> = Table<Fields, Populates, P, F>;

@Service({
  name: 'loads',
  mixins: [
    DbConnection({
      collection: 'kroviniai',
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
      certificate: {
        type: 'string',
        columnName: 'krovCertId',
        populate: 'certificates.resolve',
      },
      sealNumber: {
        type: 'string',
        columnName: 'krovPlomba',
        get: trimValueSpaces,
      },
      transportType: {
        type: 'string',
        columnName: 'krovTransportoTipas',
        populate: 'lookups.resolve',
      },
      transportNumber: {
        type: 'string',
        columnName: 'krovKonteinerioNr',
        get: trimValueSpaces,
      },
      details: {
        type: 'string',
        columnName: 'krovDetales',
        get: trimValueSpaces,
      },
      createDate: {
        type: 'date',
        columnName: 'krovDateCreated',
      },
      modifyDate: {
        type: 'date',
        columnName: 'krovDateModif',
      },
      modifyUser: {
        type: 'string',
        columnName: 'krovModifUser',
        get: trimValueSpaces,
      },
      modifyUserName: {
        type: 'string',
        columnName: 'krovModifUserName',
        get: trimValueSpaces,
      },
      isDeleted: {
        type: 'boolean',
        columnName: 'krovModifDelete',
      },
      products: {
        type: 'array',
        readonly: true,
        virtual: true,
        default: () => [],
        populate: {
          keyField: 'id',
          handler: PopulateHandlerFn('products.populateByProp'),
          params: {
            queryKey: 'load',
            mappingMulti: true,
            populate: ['country', 'manufacturer'],
          },
        },
      },
    },
    scopes: { ...DEFAULT_SCOPES },
    defaultScopes: [...Object.keys(DEFAULT_SCOPES)],
  },
})
export default class extends moleculer.Service {
  @Method
  async seedDB() {
    if (process.env.NODE_ENV !== 'local') return;

    await this.seedCsv('kroviniai', [
      'id',
      'certificate',
      'sealNumber',
      'transportType',
      'transportNumber',
      'details',
      'createDate',
      'modifyDate',
      'modifyUser',
      'modifyUserName',
      'isDeleted',
    ]);
  }
}
