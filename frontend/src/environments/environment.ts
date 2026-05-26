export const environment = {
  production: false,
  /** En desarrollo las peticiones pasan por el proxy de Angular → backend :3000 */
  apiUrl: '/api',
  /** URL pública del sitio (canónicas / JSON-LD). Vacío = origin del navegador. */
  siteUrl: '',
  /** Vacío en local para no contaminar Analytics. */
  gaMeasurementId: '',
};
