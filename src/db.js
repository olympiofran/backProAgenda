const pg = require('pg');
const knex = require('knex');
const knexConfig = require('../knexfile');

pg.types.setTypeParser(1082, (value) => value);
pg.types.setTypeParser(1083, (value) => value);
pg.types.setTypeParser(1114, (value) => value);
pg.types.setTypeParser(1184, (value) => value);

module.exports = knex(knexConfig.development);
