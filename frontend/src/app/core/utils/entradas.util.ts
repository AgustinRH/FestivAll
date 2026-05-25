import { Compra } from '../models';
import { eventoHaPasado, fechaReferenciaEvento } from './evento.util';

export interface EntradaPerfil {
  key: string;
  eventoTitulo: string;
  categoria?: string;
  localidad?: string;
  fechaCompra: string;
  fechaEvento: string;
  eventoPasado: boolean;
  precio: number;
  codigoAcceso: string;
}

/** Muestra cada entrada por separado (compatible con compras antiguas agrupadas). */
export function expandirEntradas(compras: Compra[]): EntradaPerfil[] {
  const entradas: EntradaPerfil[] = [];

  for (const compra of compras) {
    const cantidad = Math.max(1, compra.cantidad);
    const precioUnitario =
      cantidad === 1 ? Number(compra.totalPago) : Number(compra.totalPago) / cantidad;

    const ev = compra.evento;
    const fechaEvento = ev ? fechaReferenciaEvento(ev) : compra.fechaCompra.slice(0, 10);
    const pasado = ev ? eventoHaPasado(ev) : false;

    for (let i = 0; i < cantidad; i++) {
      entradas.push({
        key: `${compra.id}-${i}`,
        eventoTitulo: ev?.titulo ?? 'Evento',
        categoria: ev?.categoria?.nombreCategoria,
        localidad: ev?.ubicacion?.localidad,
        fechaCompra: compra.fechaCompra,
        fechaEvento,
        eventoPasado: pasado,
        precio: precioUnitario,
        codigoAcceso:
          cantidad === 1
            ? compra.codigoAcceso
            : `${compra.codigoAcceso}-${i + 1}`,
      });
    }
  }

  return entradas;
}

export interface GrupoEntradas {
  key: string;
  eventoTitulo: string;
  categoria?: string;
  localidad?: string;
  fechaEvento: string;
  entradas: EntradaPerfil[];
}

/** Agrupa entradas del mismo evento para listados compactos en perfil. */
export function agruparEntradas(entradas: EntradaPerfil[]): GrupoEntradas[] {
  const map = new Map<string, GrupoEntradas>();

  for (const entrada of entradas) {
    const key = `${entrada.eventoTitulo}|${entrada.fechaEvento}`;
    const existente = map.get(key);
    if (existente) {
      existente.entradas.push(entrada);
    } else {
      map.set(key, {
        key,
        eventoTitulo: entrada.eventoTitulo,
        categoria: entrada.categoria,
        localidad: entrada.localidad,
        fechaEvento: entrada.fechaEvento,
        entradas: [entrada],
      });
    }
  }

  return [...map.values()].sort((a, b) => a.fechaEvento.localeCompare(b.fechaEvento));
}
