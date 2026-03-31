import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';

const WEAK_SECRETS = new Set([
  'secret', 'jwt_secret', 'changeme', 'password', 'test', 'development',
  'your-secret-key', 'supersecret', 'mysecret',
]);

function validateStartupSecrets(): void {
  const env = process.env.NODE_ENV ?? 'development';
  if (env === 'development' || env === 'test') return;

  const jwtSecret = process.env.JWT_SECRET ?? '';
  if (!jwtSecret || jwtSecret.length < 32 || WEAK_SECRETS.has(jwtSecret.toLowerCase())) {
    throw new Error(
      `[SECURITY] JWT_SECRET is missing, too short (<32 chars), or a known weak value. ` +
      `Refusing to start in ${env} environment.`,
    );
  }
}

async function bootstrap(): Promise<void> {
  validateStartupSecrets();
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const isProduction = process.env.NODE_ENV === 'production';

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              baseUri: ["'self'"],
              frameAncestors: ["'none'"],
              objectSrc: ["'none'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('GitHub Engineering Analytics Platform API')
    .setDescription(
      'REST API for querying GitHub engineering metrics, pull requests, repositories, and developer activity. ' +
      'All metrics reflect GitHub activity patterns — not engineering value or productivity.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Enter JWT access token' },
      'access-token',
    )
    .addTag('Authentication', 'User signup, login, token refresh, and password reset')
    .addTag('Metrics', 'Aggregated engineering metrics by org, repo, and developer')
    .addTag('Repositories', 'Repository list and detail queries')
    .addTag('Developers', 'Developer list and detail queries')
    .addTag('Pull Requests', 'Pull request list with filtering and sorting')
    .addTag('Health', 'System health and observability')
    .build();

  if (process.env.ENABLE_SWAGGER === 'true') {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: false,
      },
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
