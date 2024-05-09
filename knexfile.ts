const { knexSnakeCaseMappers } = require('objection');
require('dotenv').config();

if (!process.env.DB_CONNECTION) {
  throw new Error('No database connection!');
}

const commonConfig = {
  client: 'pg',
  connection: process.env.DB_CONNECTION,
  pool: { min: 0, max: 7 },
  ...knexSnakeCaseMappers(),
};

const config = {
  ...commonConfig,

  local: {
    ...commonConfig,
    migrations: {
      tableName: 'migrations',
      schemaName: process.env.DB_SCHEMA,
      directory: './database/migrations',
    },
  },
};

export default config;
module.exports = config;
