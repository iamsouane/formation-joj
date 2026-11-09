import { existsSync } from 'node:fs';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import { AppConfig } from './core/config/app-config';
import { serveWebApp, WEB_DIST_DIR } from './core/web/serve-web-app';

async function bootstrap(): Promise<void> {
  // apps/api/.env est facultatif : sans lui, les valeurs par défaut suffisent.
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  const config = app.get(AppConfig);
  const logger = new Logger('Bootstrap');
  // En production, un seul service : l'API sert aussi le front construit (apps/web/dist). En
  // développement, c'est Vite qui le sert, sur son propre port.
  if (config.get('NODE_ENV') === 'production') {
    const served = serveWebApp(app, WEB_DIST_DIR);
    logger.log(served ? `Front servi depuis ${WEB_DIST_DIR}` : 'Front non construit : API seule');
  }
  const port = config.get('PORT');
  await app.listen(port);
  logger.log(`API sur http://localhost:${port}/api, doc sur /api/docs`);
}

void bootstrap();
