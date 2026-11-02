exports.up = async function up(knex) {
  if (await knex.schema.hasTable('codigos_recuperacao')) return;

  await knex.schema.createTable('codigos_recuperacao', (table) => {
    table.increments('id').primary();
    table.integer('cadastro_id').unsigned().notNullable()
      .references('id').inTable('cadastro').onDelete('CASCADE').onUpdate('CASCADE');
    table.string('codigo_hash', 64).notNullable();
    table.boolean('verificado').notNullable().defaultTo(false);
    table.dateTime('expira_em').notNullable();
    table.timestamp('criado_em').notNullable().defaultTo(knex.fn.now());
    table.index(['cadastro_id']);
    table.charset('utf8mb4');
    table.collate('utf8mb4_unicode_ci');
    table.engine('InnoDB');
  });
};

exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('codigos_recuperacao');
};
