const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'content_db',
  password: '1234',
  port: 5433,
});

module.exports = pool;