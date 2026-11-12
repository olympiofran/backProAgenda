const schema = require('../src/config').db.schema;

exports.up = async function up(knex) {
  if (await knex.schema.withSchema(schema).hasTable('servicos')) return;

  await knex.schema.withSchema(schema).createTable('servicos', (table) => {
    table.increments('id').primary();
    table.integer('cadastro_id').notNullable()
      .references('id').inTable(`${schema}.cadastro`).onDelete('CASCADE').onUpdate('CASCADE');
    table.string('nome', 100).notNullable();
    table.integer('duracao_minutos').notNullable();
    table.decimal('preco', 10, 2).notNullable();
    table.string('categoria', 40).notNullable().defaultTo('Geral');
    table.timestamp('criado_em').notNullable().defaultTo(knex.fn.now());
    table.index(['cadastro_id', 'nome']);
  });
};

exports.down = function down(knex) {
  return knex.schema.withSchema(schema).dropTableIfExists('servicos');
};
