exports.up = async function up(knex) {
  if (await knex.schema.hasTable('clientes')) return;

  await knex.schema.createTable('clientes', (table) => {
    table.increments('id').primary();
    table.integer('cadastro_id').unsigned().notNullable()
      .references('id').inTable('cadastro').onDelete('CASCADE').onUpdate('CASCADE');
    table.string('nome', 100).notNullable();
    table.string('telefone', 20).notNullable();
    table.string('email', 100).nullable();
    table.text('observacoes').nullable();
    table.timestamp('criado_em').notNullable().defaultTo(knex.fn.now());
    table.index(['cadastro_id', 'nome']);
    table.charset('utf8mb4');
    table.collate('utf8mb4_unicode_ci');
    table.engine('InnoDB');
  });
};

exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('clientes');
};
