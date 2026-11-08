import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { AppConfig } from '../src/core/config/app-config';
import { FakeTripMessageReader } from '../src/modules/trips/application/testing/fake-trip-message-reader';
import { TripMessageReader } from '../src/modules/trips/application/trip-message.reader';

/**
 * L'application complète, sur une base PGlite en mémoire neuve, migrations appliquées. L'assistant
 * qui lit les annonces est un faux : aucun test n'appelle Claude.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AppConfig)
    .useValue(AppConfig.fromEnv({ NODE_ENV: 'test', PGLITE_DATA_DIR: 'memory://' }))
    .overrideProvider(TripMessageReader)
    .useValue(new FakeTripMessageReader())
    .compile();
  const app = moduleRef.createNestApplication({ logger: ['error'] });
  configureApp(app);
  await app.init();
  return app;
}
