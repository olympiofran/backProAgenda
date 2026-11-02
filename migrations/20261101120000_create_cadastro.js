/**
 * Tabela base informada para o projeto.
 * `servico` guarda a atividade do profissional (o campo role do frontend).
 * `dia` e `horario` permanecem no schema pedido; a agenda fica em `agendamentos`.
 */
exports.up = async function up(knex) {
  if (await knex.schema.hasTable('cadastro')) return;

  await knex.schema.createTable('cadastro', (table) => {
    table.increments('id').primary();
    table.string('nome', 30).nullable();
    table.string('telefone', 20).nullable();
    table.string('email', 100).nullable().unique();
    table.string('senha', 255).nullable();
    table.string('servico', 30).nullable();
    table.date('dia').nullable();
    table.time('horario').nullable();
    table.charset('utf8mb4');
    table.collate('utf8mb4_unicode_ci');
    table.engine('InnoDB');
  });
};

exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('cadastro');
};
