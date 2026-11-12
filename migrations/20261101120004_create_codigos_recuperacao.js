const schema = require('../src/config').db.schema;

exports.up = async function up(knex) {
  if (await knex.schema.withSchema(schema).hasTable('codigos_recuperacao')) return;

  await knex.schema.withSchema(schema).createTable('codigos_recuperacao', (table) => {
    table.increments('id').primary();
    table.integer('cadastro_id').notNullable()
      .references('id').inTable(`${schema}.cadastro`).onDelete('CASCADE').onUpdate('CASCADE');
    table.string('codigo_hash', 64).notNullable();
    table.boolean('verificado').notNullable().defaultTo(false);
    table.timestamp('expira_em').notNullable();
    table.timestamp('criado_em').notNullable().defaultTo(knex.fn.now());
    table.index(['cadastro_id']);
  });
};

exports.down = function down(knex) {
  return knex.schema.withSchema(schema).dropTableIfExists('codigos_recuperacao');
};
