const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  port: Number(process.env.PORT || 3000),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'proagenda',
    password: process.env.DB_PASSWORD || 'proagenda',
    database: process.env.DB_NAME || 'proagenda',
  },
  jwtSecret: process.env.JWT_SECRET || 'proagenda-dev-secret-troque-em-producao',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  exposeResetCode: String(process.env.EXPOSE_RESET_CODE || 'true').toLowerCase() !== 'false',
};
