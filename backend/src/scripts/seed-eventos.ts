/**
 * Ejecutar: npm run seed:eventos
 * Inserta al menos 100 eventos con categorías, fechas, duración y stock variados.
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as mysql from 'mysql2/promise';

if (process.env.NODE_ENV !== 'production') {
  config({ path: resolve(__dirname, '../../.env') });
  config({ path: resolve(__dirname, '../../../.env') });
}

const TARGET_TOTAL = 100;

const CATEGORIAS: Record<number, { nombre: string; prefijos: string[]; imagen: string }> = {
  1: {
    nombre: 'Rock',
    prefijos: ['Rock Night', 'Guitar Fest', 'Rock en Vivo', 'Alternativa Sessions', 'Wall of Sound'],
    imagen: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
  },
  2: {
    nombre: 'Festivales',
    prefijos: ['Festival', 'Weekend Fest', 'Open Air', 'Sunset Fest', 'Costa Fest'],
    imagen: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
  },
  3: {
    nombre: 'Reggaeton',
    prefijos: ['Perreo Night', 'Urban Beach', 'Reggaeton Live', 'Latino Party', 'Dembow Session'],
    imagen: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
  },
  4: {
    nombre: 'Techno',
    prefijos: ['Techno Warehouse', 'Afterhours', 'Rave Night', 'Electronic Pulse', 'Bass Tunnel'],
    imagen: 'https://images.unsplash.com/photo-1571266023766-ef4f5f25ed8a?w=800',
  },
  5: {
    nombre: 'Flamenco',
    prefijos: ['Noche Flamenca', 'Tablao Live', 'Cante y Baile', 'Flamenco Íntimo', 'Jondo Session'],
    imagen: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800',
  },
  6: {
    nombre: 'Indie',
    prefijos: ['Indie Night', 'Garage Sessions', 'Underground Pop', 'Indie Costa', 'Vinilo Live'],
    imagen: 'https://images.unsplash.com/photo-1459749411175-04bf0292bbce?w=800',
  },
};

const LOCALIDADES = [
  { direccion: 'Paseo Marítimo s/n', localidad: 'Roquetas de Mar', provincia: 'Almería' },
  { direccion: 'Plaza de la Constitución 1', localidad: 'Almería', provincia: 'Almería' },
  { direccion: 'Av. del Mediterráneo 200', localidad: 'El Ejido', provincia: 'Almería' },
  { direccion: 'Calle Real 45', localidad: 'Níjar', provincia: 'Almería' },
  { direccion: 'Recinto Ferial', localidad: 'Vera', provincia: 'Almería' },
  { direccion: 'Parque Municipal', localidad: 'Adra', provincia: 'Almería' },
  { direccion: 'Puerto Deportivo', localidad: 'Garrucha', provincia: 'Almería' },
  { direccion: 'Auditorio Municipal', localidad: 'Huércal-Overa', provincia: 'Almería' },
  { direccion: 'Castillo de San José', localidad: 'Carboneras', provincia: 'Almería' },
  { direccion: 'Centro Cultural', localidad: 'Berja', provincia: 'Almería' },
  { direccion: 'Polideportivo Municipal', localidad: 'Vícar', provincia: 'Almería' },
  { direccion: 'Playa de los Muertos', localidad: 'Carboneras', provincia: 'Almería' },
];

const SUFIJOS = [
  'Almería',
  'Costa 2026',
  'Edición Especial',
  'Sunset Edition',
  'Live Tour',
  'Summer Vibes',
  'Night Session',
  'Weekend',
  'Experience',
  'Open Air',
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

function stockForSlot(slot: number): number {
  const slots = [2, 3, 4, 5, 8, 12, 18, 25, 40, 75, 120, 200, 350, 500, 800, 1200, 2000];
  return slots[slot % slots.length];
}

function precioForSlot(slot: number): number {
  const precios = [0, 12, 15, 18, 20, 22, 25, 28, 32, 35, 40, 45, 55, 65, 75, 85, 95, 120];
  return precios[slot % precios.length];
}

async function ensureUbicaciones(conn: mysql.Connection): Promise<number[]> {
  const ids: number[] = [];
  for (const u of LOCALIDADES) {
    const [existing] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT id_ubicacion FROM ubicacion WHERE direccion = ? AND localidad = ? LIMIT 1',
      [u.direccion, u.localidad],
    );
    if (existing.length > 0) {
      ids.push(existing[0].id_ubicacion as number);
    } else {
      const [res] = await conn.execute<mysql.ResultSetHeader>(
        'INSERT INTO ubicacion (direccion, localidad, provincia) VALUES (?, ?, ?)',
        [u.direccion, u.localidad, u.provincia],
      );
      ids.push(res.insertId);
    }
  }
  return ids;
}

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_DATABASE || 'FestivAll',
  });

  const [countRows] = await conn.execute<mysql.RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM evento',
  );
  const current = Number(countRows[0].total);
  const toInsert = Math.max(0, TARGET_TOTAL - current);

  if (toInsert === 0) {
    console.log(`Ya hay ${current} eventos (objetivo: ${TARGET_TOTAL}). Nada que insertar.`);
    await conn.end();
    return;
  }

  const ubicacionIds = await ensureUbicaciones(conn);
  const baseDate = new Date(2026, 4, 1); // 1 mayo 2026

  console.log(`Eventos actuales: ${current}. Insertando ${toInsert}...`);

  for (let i = 0; i < toInsert; i++) {
    const catId = (i % 6) + 1;
    const cat = CATEGORIAS[catId];
    const prefijo = pick(cat.prefijos, i);
    const sufijo = pick(SUFIJOS, i + catId);
    const titulo = `${prefijo} ${sufijo} ${i + 1}`.replace(/\s+/g, ' ').trim();

    const diasOffset = (i * 3) % 540;
    const fechaInicio = addDays(baseDate, diasOffset);
    const esVariosDias = i % 5 !== 0; // ~80% varios días
    const duracion = esVariosDias ? 1 + (i % 4) : 0;
    const fechaFin = duracion > 0 ? formatDate(addDays(fechaInicio, duracion)) : null;

    const horaInicio = `${pad(17 + (i % 6))}:00:00`;
    const horaFin = duracion > 0 ? '04:00:00' : `${pad(22 + (i % 4))}:30:00`;

    const precio = precioForSlot(i);
    const stock = stockForSlot(i);
    const destacado = i < 6 && current === 0 ? i < 3 : i % 17 === 0;

    const descripcion =
      `${titulo} — ${cat.nombre} en la provincia de Almería. ` +
      (duracion > 0
        ? `Evento de ${duracion + 1} días con programación continua. `
        : 'Concierto en una sola jornada. ') +
      `Aforo limitado (${stock} entradas).`;

    const [eventoRes] = await conn.execute<mysql.ResultSetHeader>(
      `INSERT INTO evento (
        id_categoria, id_ubicacion, titulo, descripcion,
        fecha_inicio, fecha_fin, hora_inicio, hora_fin,
        precio, stock, destacado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        catId,
        pick(ubicacionIds, i),
        titulo,
        descripcion,
        formatDate(fechaInicio),
        fechaFin,
        horaInicio,
        horaFin,
        precio,
        stock,
        destacado,
      ],
    );

    await conn.execute(
      'INSERT INTO imagen (id_evento, url, es_principal) VALUES (?, ?, TRUE)',
      [eventoRes.insertId, cat.imagen],
    );
  }

  const [finalRows] = await conn.execute<mysql.RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM evento',
  );
  const total = Number(finalRows[0].total);

  const [stats] = await conn.execute<mysql.RowDataPacket[]>(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN fecha_fin IS NULL THEN 1 ELSE 0 END) AS un_dia,
      SUM(CASE WHEN fecha_fin IS NOT NULL THEN 1 ELSE 0 END) AS varios_dias,
      SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END) AS pocas_entradas,
      SUM(CASE WHEN stock > 200 THEN 1 ELSE 0 END) AS muchas_entradas
    FROM evento
  `);

  console.log(`Listo. Total eventos en BD: ${total}`);
  console.log('Resumen:', stats[0]);

  await conn.end();
}

seed().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
