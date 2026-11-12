const schema = require('../src/config').db.schema;

exports.up = async function up(knex) {
  if (await knex.schema.withSchema(schema).hasTable('agendamentos')) return;

  await knex.schema.withSchema(schema).createTable('agendamentos', (table) => {
    table.increments('id').primary();
    table.integer('cadastro_id').notNullable()
      .references('id').inTable(`${schema}.cadastro`).onDelete('CASCADE').onUpdate('CASCADE');
    table.integer('cliente_id').nullable()
      .references('id').inTable(`${schema}.clientes`).onDelete('SET NULL').onUpdate('CASCADE');
    table.integer('servico_id').notNullable()
      .references('id').inTable(`${schema}.servicos`).onDelete('RESTRICT').onUpdate('CASCADE');
    table.string('cliente_nome', 100).nullable();
    table.date('data').notNullable();
    table.time('inicio').notNullable();
    table.time('fim').notNullable();
    table.decimal('preco', 10, 2).notNullable();
    table.enu('status', ['confirmado', 'cancelado']).notNullable().defaultTo('confirmado');
    table.text('observacoes').nullable();
    table.timestamp('criado_em').notNullable().defaultTo(knex.fn.now());
    table.index(['cadastro_id', 'data']);
  });
};

exports.down = function down(knex) {
  return knex.schema.withSchema(schema).dropTableIfExists('agendamentos');
};
