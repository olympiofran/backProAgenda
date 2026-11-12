const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function schemaName() {
  const name = process.env.DB_SCHEMA || 'pi_fran';
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error('DB_SCHEMA contém caracteres inválidos.');
  }
  return name;
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'proagenda',
    password: process.env.DB_PASSWORD || 'proagenda',
    database: process.env.DB_NAME || 'proagenda',
    schema: schemaName(),
    ssl: String(process.env.DB_SSL || 'false').toLowerCase() === 'true',
  },
  jwtSecret: process.env.JWT_SECRET || 'proagenda-dev-secret-troque-em-producao',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  exposeResetCode: String(process.env.EXPOSE_RESET_CODE || 'true').toLowerCase() !== 'false',
};
