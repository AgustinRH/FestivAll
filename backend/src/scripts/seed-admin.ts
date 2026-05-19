/**
 * Ejecutar: npm run seed:admin
 * Crea usuario admin@festivall.es / Admin123!
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as bcrypt from 'bcrypt';
import * as mysql from 'mysql2/promise';

config({ path: resolve(__dirname, '../../.env') });

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_DATABASE || 'FestivAll',
  });

  const email = 'admin@festivall.es';
  const hash = await bcrypt.hash('Admin123!', 10);

  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    'SELECT id FROM usuario WHERE email = ?',
    [email],
  );

  if (rows.length > 0) {
    await conn.execute(
      'UPDATE usuario SET password = ?, rol = ? WHERE email = ?',
      [hash, 'admin', email],
    );
  } else {
    await conn.execute(
      'INSERT INTO usuario (nombre, apellidos, email, password, rol) VALUES (?, ?, ?, ?, ?)',
      ['Admin', 'FestivAll', email, hash, 'admin'],
    );
  }

  console.log('Admin creado: admin@festivall.es / Admin123!');
  await conn.end();
}

seed().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
