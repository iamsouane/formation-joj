import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { AppConfig } from '../src/core/config/app-config';
import { serveWebApp } from '../src/core/web/serve-web-app';
import { FakeTripMessageReader } from '../src/modules/trips/application/testing/fake-trip-message-reader';
import { TripMessageReader } from '../src/modules/trips/application/trip-message.reader';

/**
 * L'application complète, sur une base PGlite en mémoire neuve, migrations appliquées. L'assistant
 * qui lit les annonces est un faux : aucun test n'appelle Claude. Avec `webDist`, l'API sert aussi
 * le front construit dans ce dossier, comme en production.
 */
export async function createTestApp({
  webDist,
}: { webDist?: string } = {}): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AppConfig)
    .useValue(AppConfig.fromEnv({ NODE_ENV: 'test', PGLITE_DATA_DIR: 'memory://' }))
    .overrideProvider(TripMessageReader)
    .useValue(new FakeTripMessageReader())
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: ['error'] });
  configureApp(app);
  if (webDist !== undefined) serveWebApp(app, webDist);
  await app.init();
  return app;
}
