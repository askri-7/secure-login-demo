import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '@/app.module';
import * as dotenv from 'dotenv';
import helmet from 'helmet';
import type { Express } from 'express';

dotenv.config();

async function bootstrap() {
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

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ── GRACEFUL SHUTDOWN ──
  const server = await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);

  const gracefulShutdown = (signal: string) => {
    console.log(`Received ${signal}, starting graceful shutdown...`);
    
    // 1. Stop accepting new connections
    server.close(async () => {
      console.log('HTTP server closed. Draining remaining requests...');
      
      // 2. Give in-flight requests 10 seconds to finish
      const shutdownTimeout = setTimeout(() => {
        console.error('Forced shutdown: some requests did not complete in time');
        process.exit(1);
      }, 10000);

      // 3. Close NestJS app (disconnects Prisma, stops cron jobs, etc.)
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