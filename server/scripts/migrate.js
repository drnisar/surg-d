import { readdir, readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { config } from '../src/config.js';

// Applies db/migrations/*.sql in name order, once each, recording them in schema_migrations.
const { database, ...connectionOptions } = config.db;
const dir = new URL('../db/migrations/', import.meta.url);
const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

const connection = await mysql.createConnection({ ...connectionOptions, multipleStatements: true });
try {
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE \`${database}\``);
  await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  const [rows] = await connection.query('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.name));

  for (const file of files.filter((f) => !applied.has(f))) {
    await connection.query(await readFile(new URL(file, dir), 'utf8'));
    await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
    console.log(`Applied ${file}`);
  }
  console.log(`Database ${database} is up to date`);
} finally {
  await connection.end();
}
