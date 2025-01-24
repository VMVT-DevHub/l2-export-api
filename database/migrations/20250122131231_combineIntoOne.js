const schema = process.env.DB_SCHEMA || 'public';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .withSchema(schema)
    .createTable('certificates', (table) => {
      table.increments('id');
      table.string('certificateNumber');
      table.json('importCountry');
      table.string('importPost');
      table.string('importReceiver');
      table.string('status');
      table.string('issueDate');
      table.string('blankNumber');
      table.json('post');
      table.string('postOther');
      table.string('issueEmail');
      table.string('issueName');
      table.string('issueDepartment');
      table.string('fileCount');
      table.json('exporter');
      table.json('transporters').nullable();
      table.json('loads').nullable();
      table.json('products').nullable();
    })
    .dropTable('salys')
    .dropTable('postai')
    .dropTable('rizikos')
    .dropTable('lookup')
    .dropTable('veiklavietes')
    .dropTable('produktai')
    .dropTable('kroviniai')
    .dropTable('sertifikatai');
};

exports.down = function (knex) {
  return knex.schema
    .withSchema(schema)
    .dropTable('certificates')
    .createTable('salys', (table) => {
      table.string('id');
      table.string('salPavad');
      table.string('salIso2');
      table.boolean('salEs');
      table.boolean('salElpa');
      table.string('salSearch');
      table.integer('salRizika');
    })
    .createTable('postai', (table) => {
      table.integer('id');
      table.string('postPavad');
      table.string('postKodas');
      table.string('postAdresas');
      table.boolean('postAktyvus');
    })
    .createTable('rizikos', (table) => {
      table.integer('rizId');
      table.string('rizName');
      table.integer('rizMin');
      table.integer('rizMax');
      table.integer('rizCheck');
      table.integer('rizCurr');
      table.boolean('rizUsed');
    })
    .createTable('lookup', (table) => {
      table.integer('id');
      table.string('lkpGroup');
      table.integer('lkpNum');
      table.string('lkpTitle');
      table.string('lkpDescr');
      table.integer('lkpSort');
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
      table.string('vklAdresasAob');
      table.string('vklRegNr');
      table.string('vklPatvirtNr');
      table.string('vklSwift');
      table.string('vklBandosKodas');
      table.string('vklDetales');
      table.boolean('vklAktyvus');
      table.text('vklSearch');
      table.timestamp('vklDateCreated');
      table.timestamp('vklDateModif');
      table.string('vklModifUser');
      table.string('vklModifUserName');
    })
    .createTable('produktai', (table) => {
      table.integer('id');
      table.integer('prodCertId');
      table.string('prodL1');
      table.string('prodL1Name', 1024);
      table.string('prodL2');
      table.string('prodL2Name', 1024);
      table.string('prodL3');
      table.string('prodL3Name', 1024);
      table.string('prodL4');
      table.string('prodL4Name', 1024);
      table.string('prodPavadinimas');
      table.string('prodGamintojas');
      table.string('prodSalis');
      table.string('prodVnt');
      table.string('prodKiekis');
      table.string('prodPakuotes');
      table.text('prodDetales');
      table.string('prodKilmesSert');
      table.string('prodRizika');
      table.string('prodLastLayer');
      table.timestamp('prodDateCreated');
      table.timestamp('prodDateModif');
      table.string('prodModifUser');
      table.string('prodModifUserName');
      table.boolean('prodModifDelete');
    })
    .createTable('kroviniai', (table) => {
      table.integer('id');
      table.integer('krovCertId');
      table.string('krovTipasKita');
      table.string('krovPlomba');
      table.string('krovNr');
      table.text('krovDetales');
      table.timestamp('krovDateCreated');
      table.timestamp('krovDateModif');
      table.string('krovModifUser');
      table.string('krovModifUserName');
      table.boolean('krovModifDelete');
      table.integer('krovTipas');
    })
    .createTable('sertifikatai', (table) => {
      table.integer('id');
      table.string('certNr');
      table.string('certExport');
      table.string('certExportRizika');
      table.string('certImpSalis');
      table.string('certImpPostas');
      table.string('certImpGavejas');
      table.string('certStatus');
      table.timestamp('certDateCreated');
      table.timestamp('certDateModif');
      table.date('certDateIsdavimo');
      table.date('certDateIsvykimo');
      table.string('certBlankas');
      table.string('certPostas');
      table.string('certPostasKitas');
      table.text('certDetales');
      table.string('certIsdave');
      table.string('certIsdaveName');
      table.string('certIsdaveDep');
      table.boolean('certPakeistas');
      table.string('certRizika');
      table.string('certRizikosBalas');
      table.string('certRizikosKeitimas');
      table.text('certRizikosPriezastis');
      table.boolean('certTikrinimas');
      table.string('certFileCount');
      table.string('certCreatedUser');
      table.string('certCreatedUserName');
      table.string('certCreatedUserDep');
      table.string('certModifUser');
      table.string('certModifUserName');
      table.string('certModifUserDep');
      table.boolean('certDelete');
    });
};
