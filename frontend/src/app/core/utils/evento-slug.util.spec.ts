import {
  buildEventoSlug,
  parseEventoIdFromSlug,
  getEventoSlugSegment,
} from './evento-slug.util';

describe('evento-slug.util', () => {
  describe('buildEventoSlug', () => {
    it('genera id-titulo en minúsculas sin acentos', () => {
      expect(buildEventoSlug(42, 'Festival Ñoño', 'Almería')).toBe(
        '42-festival-nono-almeria',
      );
    });

    it('omite localidad vacía', () => {
      expect(buildEventoSlug(1, 'Rock Night', '')).toBe('1-rock-night');
    });
  });

  describe('parseEventoIdFromSlug', () => {
    it('extrae el id numérico del prefijo', () => {
      expect(parseEventoIdFromSlug('42-festival-nono')).toBe(42);
    });

    it('devuelve null si no hay id válido', () => {
      expect(parseEventoIdFromSlug('abc-evento')).toBeNull();
      expect(parseEventoIdFromSlug('0-evento')).toBeNull();
    });
  });

  describe('getEventoSlugSegment', () => {
    it('usa slug guardado si existe', () => {
      expect(
        getEventoSlugSegment({
          id: 5,
          slug: '5-custom-slug',
          titulo: 'Otro título',
        }),
      ).toBe('5-custom-slug');
    });
  });
});
