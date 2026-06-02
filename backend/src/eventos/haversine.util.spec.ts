import { distanciaKm } from './haversine.util';

describe('distanciaKm', () => {
  it('devuelve 0 km para el mismo punto', () => {
    expect(distanciaKm(36.8381, -2.4597, 36.8381, -2.4597)).toBe(0);
  });

  it('calcula ~9 km entre Almería centro y el puerto', () => {
    const km = distanciaKm(36.8381, -2.4597, 36.8125, -2.545);
    expect(km).toBeGreaterThan(7);
    expect(km).toBeLessThan(11);
  });
});
