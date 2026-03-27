// db.js — Database connection
// This file connects to MySQL and exports the connection
// so all route files can use it

const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

module.exports = db;