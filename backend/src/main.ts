import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '@/app.module';
import * as dotenv from 'dotenv';
import helmet from 'helmet';
import type { Express } from 'express';
import { AllExceptionsFilter } from '@/filters/all-exceptions.filter';
// import { loadSecretsFromKeyVault } from '@/config/keyvault.service';

dotenv.config();

async function bootstrap() {
  // ═══════════════════════════════════════════
  // KEY VAULT LOADER — uncomment when available
  // ═══════════════════════════════════════════
  /*
  const vaultSecrets = await loadSecretsFromKeyVault();
  
  if (vaultSecrets.DATABASE_URL_PASSWORD && process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
      '__VAULT__',
      vaultSecrets.DATABASE_URL_PASSWORD,
    );
  }

  Object.entries(vaultSecrets).forEach(([key, value]) => {
    if (key !== 'DATABASE_URL_PASSWORD') {
      process.env[key] = value;
    }
  });
  */
  // ═══════════════════════════════════════════

  const app = await NestFactory.create(AppModule);
  
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.set('trust proxy', true);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    throw new Error('FRONTEND_URL environment variable is required');
  }

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const server = await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);

  const gracefulShutdown = (signal: string) => {
    console.log(`Received ${signal}, starting graceful shutdown...`);
    server.close(async () => {
      const shutdownTimeout = setTimeout(() => {
        console.error('Forced shutdown: some requests did not complete in time');
        process.exit(1);
      }, 10000);

      try {
        await app.close();
        clearTimeout(shutdownTimeout);
        console.log('Graceful shutdown complete.');
        process.exit(0);
      } catch (err) {
        console.error('Error during graceful shutdown:', err);
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap();