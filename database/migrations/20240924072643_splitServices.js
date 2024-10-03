const schema = process.env.DB_SCHEMA || 'public';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .withSchema(schema)
    .createTable('salys', (table) => {
      table.string('id');
      table.string('salPavad');
      table.string('salIso2');
    })
    .createTable('postai', (table) => {
      table.integer('id');
      table.string('postPavad');
      table.string('postKodas');
      table.string('postTrump');
      table.string('postSalis');
      table.string('postAdresas');
      table.boolean('postAktyvus');
    })
    .createTable('rizikos', (table) => {
      table.integer('rizId');
      table.string('rizName');
      table.integer('rizMin');
      table.integer('rizMax');
      table.integer('rizCheck');
    })
    .createTable('lookup', (table) => {
      table.integer('id');
      table.string('lkpGroup');
      table.integer('lkpNum');
      table.string('lkpTitle');
      table.string('lkpDescr');
    })
    .createTable('veiklavietes', (table) => {
      table.integer('id');
      table.string('vklVid');
      table.bigint('vklJar');
      table.string('vklTipas');
      table.string('vklPavad');
      table.boolean('vklExport');
      table.boolean('vklGamint');
      table.string('vklSalis');
      table.string('vklAdresas');
      table.string('vklRegNr');
      table.string('vklPatvirtNr');
      table.string('vklSwift');
      table.string('vklDetales');
      table.boolean('vklAktyvus');
      table.text('vklSearch');
      table.timestamp('vklDateCreated');
      table.timestamp('vklDateModif');
      table.string('vklModifUser');
      table.string('vklModifUserName');
      table.string('vklBandosKodas');
    })
    .createTable('produktai', (table) => {
      table.integer('id');
      table.integer('prodCertId');
      table.integer('prodKrovId');
      table.integer('prodGamintojas');
      table.string('prodSalis');
      table.string('prodVnt');
      table.integer('prodKiekis');
      table.text('prodDetales');
      table.string('prodKilmesSert');
      table.integer('prodRizika');
      table.string('prodL1');
      table.string('prodL1Name', 1024);
      table.string('prodL2');
      table.string('prodL2Name', 1024);
      table.string('prodL3');
      table.string('prodL3Name', 1024);
      table.string('prodL4');
      table.string('prodL4Name', 1024);
      table.timestamp('prodDateCreated');
      table.timestamp('prodDateModif');
      table.string('prodModifUser');
      table.string('prodModifUserName');
      table.string('prodPavadinimas');
      table.boolean('prodModifDelete');
      table.integer('prodLastLayer');
    })
    .createTable('kroviniai', (table) => {
      table.integer('id');
      table.integer('krovCertId');
      table.string('krovPlomba');
      table.string('krovTransportoTipas');
      table.string('krovKonteinerioNr');
      table.text('krovDetales');
      table.timestamp('krovDateCreated');
      table.timestamp('krovDateModif');
      table.string('krovModifUser');
      table.string('krovModifUserName');
      table.boolean('krovModifDelete');
    })
    .createTable('sertifikatai', (table) => {
      table.integer('id');
      table.string('certNr');
      table.integer('certExport');
      table.string('certImpSalis');
      table.string('certStatus');
      table.timestamp('certDateCreated');
      table.date('certDateIsdavimo');
      table.date('certDateIsvykimo');
      table.text('certDetales');
      table.integer('certRizika');
      table.integer('certPostas');
      table.string('certIsdave');
      table.string('certIsdaveName');
      table.string('certCreatedUser');
      table.string('certCreatedUserName');
      table.string('certModifUser');
      table.string('certModifUserName');
      table.boolean('certDelete');
      table.string('certModifDep');
      table.string('certIsdaveDep');
      table.boolean('certPakeistas');
      table.string('certBlankas');
      table.timestamp('certDateModif');
      table.integer('certRizikosBalas');
      table.boolean('certTikrinimas');
      table.integer('certRizikosKeitimas');
      table.text('certRizikosPriezastis');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .withSchema(schema)
    .dropTable('salys')
    .dropTable('postai')
    .dropTable('rizikos')
    .dropTable('lookup')
    .dropTable('veiklavietes')
    .dropTable('produktai')
    .dropTable('kroviniai')
    .dropTable('sertifikatai');
};
