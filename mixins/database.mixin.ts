'use strict';

import { parse } from 'csv-parse';
import _ from 'lodash';
import { Context } from 'moleculer';
import filtersMixin from 'moleculer-knex-filters';
import fs, { existsSync } from 'node:fs';
import config from '../knexfile';
const DbService = require('@moleculer/database').Service;

export function PopulateHandlerFn(action: string) {
  return async function (
    ctx: Context<{ populate: string | string[] }>,
    values: any[],
    docs: any[],
    field: any,
  ) {
    if (!values.length) return null;
    const rule = field.populate;
    let populate = rule.params?.populate;
    if (rule.inheritPopulate) {
      populate = ctx.params.populate;
    }
    const params = {
      ...(rule.params || {}),
      id: values,
      mapping: true,
      populate,
      throwIfNotExist: false,
    };

    const byKey: any = await ctx.call(action, params, rule.callOptions);

    let fieldName = field.name;
    if (rule.keyField) {
      fieldName = rule.keyField;
    }

    return docs?.map((d) => {
      const fieldValue = d[fieldName];
      if (!fieldValue) return null;
      return byKey[fieldValue] || null;
    });
  };
}

function makeMapping(
  data: any[],
  mapping?: string,
  options?: {
    mappingMulti?: boolean;
    mappingField?: string;
  },
) {
  if (!mapping) return data;

  return data?.reduce((acc: any, item) => {
    let value: any = item;

    if (options?.mappingField) {
      value = item[options.mappingField];
    }

    if (options?.mappingMulti) {
      return {
        ...acc,
        [`${item[mapping]}`]: [...(acc[`${item[mapping]}`] || []), value],
      };
    }

    return { ...acc, [`${item[mapping]}`]: value };
  }, {});
}

export default function (opts: any = {}) {
  const adapter: any = {
    type: 'Knex',
    options: {
      knex: config,
      tableName: opts.collection,
      schema: opts.schema || process.env.DB_SCHEMA,
    },
  };

  const cache = {
    enabled: false,
  };

  opts = _.defaultsDeep(opts, { adapter }, { cache: opts.cache || cache });

  const removeRestActions: any = {};

  if (opts?.createActions === undefined || opts?.createActions !== false) {
    removeRestActions.replace = {
      rest: null as any,
    };
  }

  const schema = {
    mixins: [DbService(opts), filtersMixin()],

    async started() {
      await this.getAdapter();
      const count = await this.countEntities(null, {
        scope: false,
      });

      if (count == 0 && _.isFunction(this.seedDB)) {
        this.logger.info(`Seed '${opts.collection}' collection...`);
        await this.seedDB();
      }
    },

    actions: {
      ...removeRestActions,

      async findOne(ctx: any) {
        const result: any[] = await ctx.call(`${this.name}.find`, ctx.params);
        if (result.length) return result[0];
        return;
      },

      async removeAllEntities(ctx: any) {
        return await this.clearEntities(ctx);
      },

      async populateByProp(
        ctx: Context<{
          id: number | number[];
          queryKey: string;
          query: any;
          mapping?: boolean;
          mappingMulti?: boolean;
          mappingField: string;
        }>,
      ): Promise<any> {
        const { id, queryKey, query, mapping, mappingMulti, mappingField } = ctx.params;

        delete ctx.params.queryKey;
        delete ctx.params.id;
        delete ctx.params.mapping;
        delete ctx.params.mappingMulti;
        delete ctx.params.mappingField;

        const entities = await this.findEntities(ctx, {
          ...ctx.params,
          query: {
            ...(query || {}),
            [queryKey]: { $in: id },
          },
        });

        return makeMapping(entities, mapping ? queryKey : '', {
          mappingMulti,
          mappingField: mappingField,
        });
      },
    },

    methods: {
      filterQueryIds(ids: number[], queryIds?: any) {
        if (!queryIds) return ids;

        queryIds = (Array.isArray(queryIds) ? queryIds : [queryIds]).map((id: any) => parseInt(id));

        return ids.filter((id) => queryIds.indexOf(id) >= 0);
      },

      async seedCsv(fileName: string, columns: string[]) {
        const records = [];

        const file = `${__dirname}/../database/seed/${fileName}.csv`;
        const exists = existsSync(file);
        if (!exists) return;
        const parser = fs.createReadStream(file).pipe(parse());

        for await (const record of parser) {
          const obj: any = {};

          const values = record.map((c: string) => {
            if (c === 'NULL') return null;
            if (c === 'True') return true;
            if (c === 'False') return false;

            try {
              return JSON.parse(c);
            } catch {
              return c;
            }
          });

          for (const key in values) {
            const value = values[key];
            const column = columns[key as any];
            obj[column] = value;
          }

          records.push(obj);
        }

        await this.createEntities(null, records.splice(1));
      },
    },

    hooks: {
      before: {
        find: 'applyFilterFunction',
        list: 'applyFilterFunction',
      },
      after: {
        find: [
          async function (
            ctx: Context<{
              mapping: string;
              mappingMulti: boolean;
              mappingField: string;
            }>,
            data: any[],
          ) {
            const { mapping, mappingMulti, mappingField } = ctx.params;
            return makeMapping(data, mapping, {
              mappingMulti,
              mappingField,
            });
          },
        ],
      },
    },

    merged(schema: any) {
      if (schema.actions) {
        for (const action in schema.actions) {
          const params = schema.actions[action].additionalParams;
          if (typeof params === 'object') {
            schema.actions[action].params = {
              ...schema.actions[action].params,
              ...params,
            };
          }
        }
      }
    },
  };

  return schema;
}
