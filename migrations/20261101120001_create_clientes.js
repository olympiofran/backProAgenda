const schema = require('../src/config').db.schema;

exports.up = async function up(knex) {
  if (await knex.schema.withSchema(schema).hasTable('clientes')) return;

  await knex.schema.withSchema(schema).createTable('clientes', (table) => {
    table.increments('id').primary();
    table.integer('cadastro_id').notNullable()
      .references('id').inTable(`${schema}.cadastro`).onDelete('CASCADE').onUpdate('CASCADE');
    table.string('nome', 100).notNullable();
    table.string('telefone', 20).notNullable();
    table.string('email', 100).nullable();
    table.text('observacoes').nullable();
    table.timestamp('criado_em').notNullable().defaultTo(knex.fn.now());
    table.index(['cadastro_id', 'nome']);
  });
};

exports.down = function down(knex) {
  return knex.schema.withSchema(schema).dropTableIfExists('clientes');
};
