# FestivAll — Guías del frontend

Esta carpeta se incluye en la documentación generada por [Compodoc](../DOCUMENTATION.md#angular-compodoc).

## Flujo de datos (resumen)

1. **Componentes** (`pages/`, `shared/`) muestran la UI y delegan en servicios.
2. **Servicios** (`core/services/`) llaman a la API REST (`environment.apiUrl`).
3. **Interceptores** (`auth.interceptor`) adjuntan el JWT en peticiones autenticadas.
4. **Guards** (`auth.guard`) protegen rutas que requieren sesión.
5. **Utils** (`core/utils/`) concentran lógica pura (slugs SEO, imágenes, validación de formularios).

Contratos HTTP detallados: OpenAPI del backend en `/api/docs`.
