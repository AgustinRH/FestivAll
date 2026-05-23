import { Compra } from '../models';

export interface EntradaPerfil {
  key: string;
  eventoTitulo: string;
  categoria?: string;
  localidad?: string;
  fechaCompra: string;
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

    for (let i = 0; i < cantidad; i++) {
      entradas.push({
        key: `${compra.id}-${i}`,
        eventoTitulo: compra.evento?.titulo ?? 'Evento',
        categoria: compra.evento?.categoria?.nombreCategoria,
        localidad: compra.evento?.ubicacion?.localidad,
        fechaCompra: compra.fechaCompra,
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
