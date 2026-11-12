/**
 * Tabela base informada para o projeto.
 * `servico` guarda a atividade do profissional (o campo role do frontend).
 * `dia` e `horario` permanecem no schema pedido; a agenda fica em `agendamentos`.
 */
const schema = require('../src/config').db.schema;

exports.up = async function up(knex) {
  await knex.raw('CREATE SCHEMA IF NOT EXISTS ??', [schema]);
  if (await knex.schema.withSchema(schema).hasTable('cadastro')) return;

  await knex.schema.withSchema(schema).createTable('cadastro', (table) => {
    table.increments('id').primary();
    table.string('nome', 30).nullable();
    table.string('telefone', 20).nullable();
    table.string('email', 100).nullable().unique();
    table.string('senha', 255).nullable();
    table.string('servico', 30).nullable();
    table.date('dia').nullable();
    table.time('horario').nullable();
  });
};

exports.down = function down(knex) {
  return knex.schema.withSchema(schema).dropTableIfExists('cadastro');
};
