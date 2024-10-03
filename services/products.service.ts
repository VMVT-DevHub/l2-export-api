'use strict';
import moleculer from 'moleculer';
import { Action, Method, Service } from 'moleculer-decorators';
import DbConnection from '../mixins/database.mixin';
import { CommonFields, CommonPopulates, DEFAULT_SCOPES, Table, trimValueSpaces } from '../types';
import { Certificate } from './certificates.service';
import { Load } from './loads.service';
import { ActivityLocation } from './activityLocations.service';
import { Country } from './countries.service';

interface Fields {
  id: number; // id
  certificate: Certificate['id']; // prodCertId
  load: Load['id']; // prodKrovId
  manufacturer: ActivityLocation['id']; // prodGamintojas
  country: Country['id']; // prodSalis
  unit: string; // prodVnt
  amount: number; // prodKiekis
  details: string; // prodDetales
  originCertificate: string; // prodKilmesSert
  risk: number; // prodRizika
  prodL1: string; // prodL1
  prodL1Name: string; // prodL1Name
  prodL2: string; // prodL2
  prodL2Name: string; // prodL2Name
  prodL3: string; // prodL3
  prodL3Name: string; // prodL3Name
  prodL4: string; // prodL4
  prodL4Name: string; // prodL4Name
  createDate: Date; // prodDateCreated
  modifyDate: Date; // prodDateModif
  modifyUser: string; // prodModifUser
  modifyUserName: string; // prodModifUserName
  name: string; // prodPavadinimas
  isDeleted: boolean; // prodModifDelete
  lastLayer: number; // prodLastLayer
}

interface Populates extends CommonPopulates {
  certificate: Certificate;
  load: Load;
  manufacturer: ActivityLocation;
  country: Country;
}

export type Product<
  P extends keyof Populates = never,
  F extends keyof (Fields & Populates) = keyof Fields,
> = Table<Fields, Populates, P, F>;

@Service({
  name: 'products',
  mixins: [
    DbConnection({
      collection: 'produktai',
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
      certificate: {
        type: 'number',
        columnName: 'prodCertId',
        populate: 'certificates.resolve',
      },
      load: {
        type: 'number',
        columnName: 'prodKrovId',
        populate: 'loads.resolve',
      },
      manufacturer: {
        type: 'number',
        columnName: 'prodGamintojas',
        populate: 'activityLocations.resolve',
      },
      country: {
        type: 'string',
        columnName: 'prodSalis',
        populate: 'countries.resolve',
      },
      unit: {
        type: 'string',
        columnName: 'prodVnt',
        get: trimValueSpaces,
      },
      amount: {
        type: 'number',
        columnName: 'prodKiekis',
      },
      details: {
        type: 'string',
        columnName: 'prodDetales',
        get: trimValueSpaces,
      },
      originCertificate: {
        type: 'string',
        columnName: 'prodKilmesSert',
        get: trimValueSpaces,
      },
      risk: {
        type: 'number',
        columnName: 'prodRizika',
      },
      prodL1: {
        type: 'string',
        columnName: 'prodL1',
        get: trimValueSpaces,
      },
      prodL1Name: {
        type: 'string',
        columnName: 'prodL1Name',
        get: trimValueSpaces,
      },
      prodL2: {
        type: 'string',
        columnName: 'prodL2',
        get: trimValueSpaces,
      },
      prodL2Name: {
        type: 'string',
        columnName: 'prodL2Name',
        get: trimValueSpaces,
      },
      prodL3: {
        type: 'string',
        columnName: 'prodL3',
        get: trimValueSpaces,
      },
      prodL3Name: {
        type: 'string',
        columnName: 'prodL3Name',
        get: trimValueSpaces,
      },
      prodL4: {
        type: 'string',
        columnName: 'prodL4',
        get: trimValueSpaces,
      },
      prodL4Name: {
        type: 'string',
        columnName: 'prodL4Name',
        get: trimValueSpaces,
      },
      createDate: {
        type: 'date',
        columnName: 'prodDateCreated',
      },
      modifyDate: {
        type: 'date',
        columnName: 'prodDateModif',
      },
      modifyUser: {
        type: 'string',
        columnName: 'prodModifUser',
        get: trimValueSpaces,
      },
      modifyUserName: {
        type: 'string',
        columnName: 'prodModifUserName',
        get: trimValueSpaces,
      },
      name: {
        type: 'string',
        columnName: 'prodPavadinimas',
        get: trimValueSpaces,
      },
      isDeleted: {
        type: 'boolean',
        columnName: 'prodModifDelete',
      },
      lastLayer: {
        type: 'number',
        columnName: 'prodLastLayer',
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

    await this.seedCsv('produktai', [
      'id',
      'certificate',
      'load',
      'manufacturer',
      'country',
      'unit',
      'amount',
      'details',
      'originCertificate',
      'risk',
      'prodL1',
      'prodL1Name',
      'prodL2',
      'prodL2Name',
      'prodL3',
      'prodL3Name',
      'prodL4',
      'prodL4Name',
      'createDate',
      'modifyDate',
      'modifyUser',
      'modifyUserName',
      'name',
      'isDeleted',
      'lastLayer',
    ]);
  }
}
