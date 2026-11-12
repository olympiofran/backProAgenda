const path = require('path');
const config = require('./src/config');

const connection = {
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
};

if (config.db.ssl) {
  connection.ssl = { rejectUnauthorized: false };
}

module.exports = {
  development: {
    client: 'pg',
    connection,
    searchPath: [config.db.schema, 'public'],
    pool: {
      min: 0,
      max: 10,
      afterCreate(conn, done) {
        conn.query(`CREATE SCHEMA IF NOT EXISTS "${config.db.schema}"`, (err) => done(err, conn));
      },
    },
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      schemaName: config.db.schema,
    },
    seeds: {
      directory: path.join(__dirname, 'seeds'),
    },
  },
};
