exports.up = async function up(knex) {
  if (await knex.schema.hasTable('servicos')) return;

  await knex.schema.createTable('servicos', (table) => {
    table.increments('id').primary();
    table.integer('cadastro_id').unsigned().notNullable()
      .references('id').inTable('cadastro').onDelete('CASCADE').onUpdate('CASCADE');
    table.string('nome', 100).notNullable();
    table.integer('duracao_minutos').unsigned().notNullable();
    table.decimal('preco', 10, 2).notNullable();
    table.string('categoria', 40).notNullable().defaultTo('Geral');
    table.timestamp('criado_em').notNullable().defaultTo(knex.fn.now());
    table.index(['cadastro_id', 'nome']);
    table.charset('utf8mb4');
    table.collate('utf8mb4_unicode_ci');
    table.engine('InnoDB');
  });
};

exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('servicos');
};
