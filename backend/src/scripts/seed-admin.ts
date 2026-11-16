/**
 * Ejecutar: npm run seed:admin
 * Crea o actualiza admin info@festivall.club (contraseña por defecto solo en cuenta nueva)
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as bcrypt from 'bcrypt';
import * as mysql from 'mysql2/promise';

if (process.env.NODE_ENV !== 'production') {
  config({ path: resolve(__dirname, '../../.env') });
}

const ADMIN_EMAIL = 'info@festivall.club';
const LEGACY_ADMIN_EMAIL = 'admin@festivall.es';
const DEFAULT_PASSWORD = 'Admin1234!';

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_DATABASE || 'FestivAll',
  });

  await conn.execute(
    'UPDATE usuario SET email = ?, email_verificado = TRUE, rol = ? WHERE email = ?',
    [ADMIN_EMAIL, 'admin', LEGACY_ADMIN_EMAIL],
  );

  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    'SELECT id FROM usuario WHERE email = ?',
    [ADMIN_EMAIL],
  );

  if (rows.length > 0) {
    await conn.execute(
      'UPDATE usuario SET rol = ?, email_verificado = TRUE WHERE email = ?',
      ['admin', ADMIN_EMAIL],
    );
    console.log(`Admin actualizado: ${ADMIN_EMAIL} (contraseña sin cambios)`);
  } else {
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    await conn.execute(
      'INSERT INTO usuario (nombre, apellidos, email, password, rol, email_verificado) VALUES (?, ?, ?, ?, ?, TRUE)',
      ['Admin', 'FestivAll', ADMIN_EMAIL, hash, 'admin'],
    );
    console.log(`Admin creado: ${ADMIN_EMAIL} / ${DEFAULT_PASSWORD}`);
  }

  await conn.end();
}

seed().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
