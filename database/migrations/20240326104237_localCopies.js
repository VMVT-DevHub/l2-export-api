const schema = process.env.DB_SCHEMA || 'public';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.raw(`
CREATE TABLE IF NOT EXISTS ${schema}.zur123
(
    data timestamp without time zone,
    enr numeric(16,0) NOT NULL,
    year numeric(5,0),
    raj character(30) COLLATE pg_catalog."default",
    fir character(50) COLLATE pg_catalog."default",
    sal character(30) COLLATE pg_catalog."default",
    sritis character(100) COLLATE pg_catalog."default",
    sertif character(25) COLLATE pg_catalog."default",
    pos character(30) COLLATE pg_catalog."default",
    tranz character(255) COLLATE pg_catalog."default",
    paras character(30) COLLATE pg_catalog."default",
    pastaba character(100) COLLATE pg_catalog."default",
    tranr character(20) COLLATE pg_catalog."default",
    plomba character(15) COLLATE pg_catalog."default",
    status text COLLATE pg_catalog."default",
    id integer NOT NULL,
    CONSTRAINT zur123_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS ${schema}.zur1p
(
    id integer NOT NULL,
    kkod character(10) COLLATE pg_catalog."default",
    kro character(40) COLLATE pg_catalog."default",
    kiek numeric(13,3),
    pak integer,
    kilsert character(25) COLLATE pg_catalog."default",
    gamintojas character(255) COLLATE pg_catalog."default",
    lid integer,
    CONSTRAINT zur1p_pkey PRIMARY KEY (id)
)
`);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.withSchema(schema).dropTableIfExists('zur1p').dropTableIfExists('zur123');
};
