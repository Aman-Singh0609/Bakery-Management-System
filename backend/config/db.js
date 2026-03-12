const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT),
});

pool.connect()
  .then(() => {
    console.log('✅ Connected to PostgreSQL database successfully.');
  })
  .catch((err) => {
    console.error('❌ Error connecting to PostgreSQL database:', err);
  });

module.exports = pool;
