export const STOCK_ULTIMAS_ENTRADAS_MAX = 5;
export const DESCUENTO_ULTIMAS_ENTRADAS = 0.15;

export function aplicaDescuentoUltimasEntradas(stock: number): boolean {
  return stock > 0 && stock <= STOCK_ULTIMAS_ENTRADAS_MAX;
}

export function getPrecioUnitario(evento: {
  precio: number;
  stock: number;
}): number {
  const precio = Number(evento.precio);
  if (precio <= 0) return 0;
  if (aplicaDescuentoUltimasEntradas(evento.stock)) {
    return Math.round(precio * (1 - DESCUENTO_ULTIMAS_ENTRADAS) * 100) / 100;
  }
  return precio;
}
