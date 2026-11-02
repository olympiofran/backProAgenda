exports.up = async function up(knex) {
  if (await knex.schema.hasTable('agendamentos')) return;

  await knex.schema.createTable('agendamentos', (table) => {
    table.increments('id').primary();
    table.integer('cadastro_id').unsigned().notNullable()
      .references('id').inTable('cadastro').onDelete('CASCADE').onUpdate('CASCADE');
    table.integer('cliente_id').unsigned().nullable()
      .references('id').inTable('clientes').onDelete('SET NULL').onUpdate('CASCADE');
    table.integer('servico_id').unsigned().notNullable()
      .references('id').inTable('servicos').onDelete('RESTRICT').onUpdate('CASCADE');
    table.string('cliente_nome', 100).nullable();
    table.date('data').notNullable();
    table.time('inicio').notNullable();
    table.time('fim').notNullable();
    table.decimal('preco', 10, 2).notNullable();
    table.enu('status', ['confirmado', 'cancelado']).notNullable().defaultTo('confirmado');
    table.text('observacoes').nullable();
    table.timestamp('criado_em').notNullable().defaultTo(knex.fn.now());
    table.index(['cadastro_id', 'data']);
    table.charset('utf8mb4');
    table.collate('utf8mb4_unicode_ci');
    table.engine('InnoDB');
  });
};

exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('agendamentos');
};
