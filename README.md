# backProAgenda

API REST do ProAgenda. Cada profissional autenticado vê somente os próprios clientes, serviços e agendamentos.

O Node.js roda na máquina. O banco é PostgreSQL, no schema `pi_fran`. A conexão vem do `.env`.

## Stack

| Peça | Uso |
|---|---|
| Node.js 18+ | Runtime da API |
| Express 4 | Servidor HTTP e rotas |
| Knex 3 | Migrations, seeds e consultas |
| pg | Driver PostgreSQL |
| PostgreSQL 16 | Banco local no Docker, ou um Postgres remoto como o Supabase |
| bcryptjs | Hash da senha; a senha nunca é gravada em texto |
| jsonwebtoken | Sessão Bearer, válida por 7 dias |
| cors | Chamadas do frontend em outra origem |
| express-rate-limit | Limite de 40 tentativas a cada 15 minutos em login e recuperação |
| dotenv | Variáveis do arquivo `.env` |

## Pré-requisitos

- Node.js 18 ou superior e npm
- Docker, só se o PostgreSQL for o da máquina. Um banco remoto não precisa do Docker.

## Configuração

Na pasta `backProAgenda`:

```powershell
npm install
copy .env.example .env
```

O `.env.example` aponta para o PostgreSQL local (`127.0.0.1:5432`, banco, usuário e senha `proagenda`, schema `pi_fran`). Para o Supabase, preencha host, usuário, senha, banco e `DB_SSL=true` só no `.env`. A senha não entra no código. Troque `JWT_SECRET` fora de um ambiente local.

| Variável | Função |
|---|---|
| `PORT` | Porta da API. Padrão `3000` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexão PostgreSQL |
| `DB_SCHEMA` | Schema das tabelas. Padrão `pi_fran` |
| `DB_SSL` | `true` para o Supabase. `false` no Postgres local |
| `JWT_SECRET` | Chave de assinatura do token |
| `JWT_EXPIRES_IN` | Validade do token. Padrão `7d` |
| `EXPOSE_RESET_CODE` | `true` devolve o código OTP em `demoCode`, para o toast do frontend. Com envio de e-mail real, use `false` |

## Como rodar

```powershell
npm run db:up
npm run db:setup
npm run dev
```

Com o `.env` apontando para um Postgres remoto, pule o `db:up`. Esse comando sobe o PostgreSQL 16 local em `localhost:5432` e guarda os dados no volume `proagenda_postgres`. `db:setup` aplica as migrations no schema `pi_fran` e grava a conta de demonstração. Os dois passos podem ser repetidos: a migration pula a tabela que já existe e o seed só insere a conta, o serviço, o cliente ou o horário que ainda não está no banco. `dev` reinicia a API quando um arquivo de `src` muda.

A API fica em `http://localhost:3000`. Se o PostgreSQL não estiver acessível, o processo encerra.

Para subir sem o modo watch:

```powershell
npm start
```

Para parar o banco:

```powershell
npm run db:down
```

`db:down` remove o container e mantém o volume. Os dados continuam no próximo `db:up`.

Conta de demonstração, criada pelo seed:

| Campo | Valor |
|---|---|
| E-mail | `ana@proagenda.com` |
| Senha | `123456` |
| Atividade | Tatuadora & Piercer |

O seed também grava 8 serviços, 6 clientes e 12 agendamentos na semana corrente. Rodar de novo não duplica esses registros: a conta é reconhecida pelo e-mail, o serviço pelo nome, o cliente pelo e-mail e o agendamento pela data, horário e cliente. Uma conta que já existe não tem a senha reescrita.

## Migrations e seeds

As migrations ficam em `migrations/` e os seeds em `seeds/`. O Knex usa o ambiente `development` do `knexfile.js`, que lê o mesmo `.env` da API.

| Comando | O que faz |
|---|---|
| `npm run migrate` | Aplica as migrations pendentes (`knex migrate:latest`) |
| `npm run migrate:rollback` | Desfaz o último lote (`knex migrate:rollback`) |
| `npm run seed` | Roda os seeds (`knex seed:run`) |
| `npm run db:setup` | Migrations e, em seguida, o seed |

Ordem das migrations:

1. `cadastro` — conta do profissional
2. `clientes`
3. `servicos`
4. `agendamentos`
5. `codigos_recuperacao` — OTP de recuperação de senha

Para criar uma migration nova, com o PostgreSQL acessível:

```powershell
npx knex migrate:make nome_da_migration
```

## Scripts

| Script | Comando |
|---|---|
| `start` | `node src/index.js` |
| `dev` | `node --watch src/index.js` |
| `db:up` | `docker compose up -d postgres` |
| `db:down` | `docker compose down` |
| `migrate` | `knex migrate:latest` |
| `migrate:rollback` | `knex migrate:rollback` |
| `seed` | `knex seed:run` |
| `db:setup` | `knex migrate:latest && knex seed:run` |

## Tabelas

A primeira migration cria `cadastro` com as colunas de base. O e-mail é único.

| Coluna | Uso |
|---|---|
| nome, telefone, email, senha | Conta do profissional |
| servico | Atividade profissional (o `role` do frontend) |
| dia, horario | Mantidos na tabela pedida; a agenda não usa essas colunas |

As tabelas seguintes:

- `clientes` — clientes do profissional
- `servicos` — catálogo com duração, preço e categoria
- `agendamentos` — compromissos, com bloqueio de horário sobreposto
- `codigos_recuperacao` — código de 4 dígitos, válido por 5 minutos, guardado como hash

Excluir um cliente mantém o agendamento e solta o vínculo. Excluir um serviço que já tem agendamento responde `409`.

## Rotas

`GET /api/health` verifica a conexão com o banco.

Autenticação, sem token:

- `POST /api/login`
- `POST /api/auth/register`
- `POST /api/auth/reset-code`
- `POST /api/auth/verify-code`
- `POST /api/auth/reset-password`

As demais rotas exigem `Authorization: Bearer <token>`:

- `GET|POST /api/agendamentos`, `PUT /api/agendamentos/:id`, `PATCH /api/agendamentos/:id/status`, `DELETE /api/agendamentos/:id`
- `GET|POST /api/clientes`, `PUT|DELETE /api/clientes/:id`
- `GET|POST /api/servicos`, `PUT|DELETE /api/servicos/:id`

Datas vão em `aaaa-mm-dd` e horários em `HH:MM`. Erros voltam como `{ "message": "..." }`.

## Frontend

No `ProAgenda/index.html`:

```js
const API_BASE = 'http://localhost:3000';
const USE_MOCK = false;
```

Com `EXPOSE_RESET_CODE=true`, a recuperação de senha devolve o código em `demoCode` e o frontend mostra esse valor no toast.
