'use strict';
import moleculer, { Context } from 'moleculer';
import { Action, Method, Service } from 'moleculer-decorators';
import DbConnection, { PopulateHandlerFn } from '../mixins/database.mixin';
import {
  DEFAULT_SCOPES,
  FieldHookCallback,
  Table,
  throwNotFoundError,
  trimValueSpaces,
} from '../types';
import { ActivityLocation } from './activityLocations.service';
import { Country } from './countries.service';
import { Post } from './posts.service';
import { Risk } from './risks.service';

interface Fields {
  id: number;
  certificateNumber: string; // certNr
  exporter: ActivityLocation['id']; // certExport
  importCountry: Country['id']; // certImpSalis
  status: string; // certStatus
  createDate: Date; // certDateCreated
  date: Date; // certDateIsdavimo
  departureDate: Date; // certDateIsvykimo
  notes: string; // certDetales
  risk: Risk['id']; // certRizika
  post: Post['id']; // certPostas
  issueEmail: string; // certIsdave
  issueName: string; // certIsdaveName
  createName: string; // certCreatedUser
  createUserName: string; // certCreatedUserName
  modifyUser: string; // certModifUser
  modifyUserName: string; // certModifUserName
  isDeleted: boolean; // certDelete
  modifyDepartment: string; // certModifDep
  issueDepartment: string; // certIsdaveDep
  isModified: boolean; // certPakeistas
  blank: string; // certBlankas
  modifyDate: Date; // certDateModif
  riskValue: number; // certRizikosBalas
  isChecking: boolean; // certTikrinimas
  riskModify: number; // certRizikosKeitimas
  riskReason: string; // certRizikosPriezastis
}

interface Populates {
  exporter: ActivityLocation;
  importCountry: Country;
  post: Post;
  risk: Risk;
}

export type Certificate<
  P extends keyof Populates = never,
  F extends keyof (Fields & Populates) = keyof Fields,
> = Table<Fields, Populates, P, F>;

@Service({
  name: 'certificates',
  mixins: [
    DbConnection({
      collection: 'sertifikatai',
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
      certificateNumber: {
        type: 'string',
        columnName: 'certNr',
        get: trimValueSpaces,
      },
      exporter: {
        type: 'number',
        columnName: 'certExport',
        populate: {
          action: 'activityLocations.resolve',
          params: {
            populate: ['country'],
          },
        },
      },
      importCountry: {
        type: 'string',
        columnName: 'certImpSalis',
        populate: 'countries.resolve',
      },
      status: {
        type: 'string',
        columnName: 'certStatus',
        get: trimValueSpaces,
      },
      createDate: {
        type: 'date',
        columnName: 'certDateCreated',
      },
      date: {
        type: 'date',
        columnName: 'certDateIsdavimo',
      },
      year: {
        virtual: true,
        get: ({ entity }: FieldHookCallback) => {
          return entity.certDateIsdavimo?.getFullYear?.().toString();
        },
      },
      departureDate: {
        type: 'date',
        columnName: 'certDateIsvykimo',
      },
      notes: {
        type: 'string',
        columnName: 'certDetales',
        get: trimValueSpaces,
      },
      risk: {
        type: 'number',
        columnName: 'certRizika',
        populate: 'risks.resolve',
      },
      post: {
        type: 'number',
        columnName: 'certPostas',
        populate: 'posts.resolve',
      },
      issueEmail: {
        type: 'string',
        columnName: 'certIsdave',
        get: trimValueSpaces,
      },
      issueName: {
        type: 'string',
        columnName: 'certIsdaveName',
        get: trimValueSpaces,
      },
      createName: {
        type: 'string',
        columnName: 'certCreatedUser',
        get: trimValueSpaces,
      },
      createUserName: {
        type: 'string',
        columnName: 'certCreatedUserName',
        get: trimValueSpaces,
      },
      modifyUser: {
        type: 'string',
        columnName: 'certModifUser',
        get: trimValueSpaces,
      },
      modifyUserName: {
        type: 'string',
        columnName: 'certModifUserName',
        get: trimValueSpaces,
      },
      isDeleted: {
        type: 'boolean',
        columnName: 'certDelete',
      },
      modifyDepartment: {
        type: 'string',
        columnName: 'certModifDep',
        get: trimValueSpaces,
      },
      issueDepartment: {
        type: 'string',
        columnName: 'certIsdaveDep',
        get: trimValueSpaces,
      },
      isModified: {
        type: 'boolean',
        columnName: 'certPakeistas',
      },
      blank: {
        type: 'string',
        columnName: 'certBlankas',
        get: trimValueSpaces,
      },
      modifyDate: {
        type: 'date',
        columnName: 'certDateModif',
      },
      riskValue: {
        type: 'number',
        columnName: 'certRizikosBalas',
      },
      isChecking: {
        type: 'boolean',
        columnName: 'certTikrinimas',
      },
      riskModify: {
        type: 'number',
        columnName: 'certRizikosKeitimas',
      },
      riskReason: {
        type: 'string',
        columnName: 'certRizikosPriezastis',
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
            populate: ['products', 'transportType'],
          },
        },
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
            queryKey: 'certificate',
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
  @Action({
    rest: 'GET /search',
    params: {
      certificateNumber: 'string|convert|min:3',
      year: 'string|convert|optional',
    },
  })
  async search(ctx: Context<{ certificateNumber: string; year?: string; grantedNumber: string }>) {
    const { certificateNumber, year } = ctx.params;

    // it's really messy. Spaces can be found anywhere (except in cetirifacte number (without letters))
    const query: any = {
      certificateNumber: {
        $ilike: `%${certificateNumber}`,
      },
    };

    if (year) {
      query.year = {
        $raw: {
          condition: "date_part('year', cert_date_isdavimo) = ?",
          bindings: [year],
        },
      };
    }

    const certificates: Certificate[] = await this.findEntities(ctx, {
      query,
      fields: [
        'id',
        'year',
        'certificateNumber',
        'status',
        'date',
        'exporter',
        'importCountry',
        'notes',
        'post',
        'issueName',
        'issueEmail',
        'loads',
        'products',
      ],
      populate: ['exporter', 'importCountry', 'post', 'loads', 'products'],
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

    await this.seedCsv('sertifikatai', [
      'id',
      'certificateNumber',
      'exporter',
      'importCountry',
      'status',
      'createDate',
      'date',
      'departureDate',
      'notes',
      'risk',
      'post',
      'issueEmail',
      'issueName',
      'createName',
      'createUserName',
      'modifyUser',
      'modifyUserName',
      'isDeleted',
      'modifyDepartment',
      'issueDepartment',
      'isModified',
      'blank',
      'modifyDate',
      'riskValue',
      'isChecking',
      'riskModify',
      'riskReason',
    ]);
  }
}
