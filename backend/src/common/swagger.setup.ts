import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Registra OpenAPI (Swagger UI) en `/docs` (público vía nginx: `/api/docs`).
 * Variable de entorno: `SWAGGER_ENABLED=false` para ocultar en producción.
 */
export function setupSwagger(app: INestApplication): void {
  if (process.env.SWAGGER_ENABLED === 'false') {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('FestivAll API')
    .setDescription(
      'API REST de FestivAll: autenticación, eventos, compras (Stripe), valoraciones y administración.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token obtenido en POST /auth/login o /auth/admin/login',
      },
      'jwt',
    )
    .addServer(
      process.env.SWAGGER_SERVER_URL ??
        (process.env.FRONTEND_URL
          ? `${process.env.FRONTEND_URL.replace(/\/$/, '')}/api`
          : 'http://localhost:3000'),
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // Ruta `/docs` en Nest; nginx expone `https://dominio/api/docs` (proxy /api/ → backend /)
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: { persistAuthorization: true },
  });
}
