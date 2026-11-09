import { existsSync } from 'node:fs';
import { Logger } from '@nestjs/common';
import { AppConfig } from './core/config/app-config';
import { type DatabaseConnection, openDatabase } from './core/database/database';
import { SeedDemoTrips } from './modules/trips/application/use-cases/seed-demo-trips';
import { DrizzleTripRepository } from './modules/trips/infra/drizzle-trip.repository';

const logger = new Logger('Database');
const ATTEMPTS = 5;
const RETRY_DELAY_MS = 3000;

/** Une base qui démarre en même temps que le service peut refuser les premières connexions. */
async function migrateWhenReady(connection: DatabaseConnection): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await connection.migrate();
      return;
    } catch (error) {
      if (attempt === ATTEMPTS) throw error;
      logger.warn(`Base injoignable (essai ${attempt} sur ${ATTEMPTS}), nouvel essai dans 3 s.`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

/**
 * L'étape de déploiement qui précède le démarrage de l'API en production (`pnpm start`) : elle
 * applique les migrations, que l'API n'applique pas elle-même en production, puis, si
 * `SEED_DEMO_DATA` le demande, charge les trajets de démonstration dans une base encore vide.
 */
async function prepareDatabase(): Promise<void> {
  // apps/api/.env est facultatif, comme pour l'API.
  if (existsSync('.env')) process.loadEnvFile('.env');
  const config = AppConfig.fromEnv(process.env);
  const connection = openDatabase({
    databaseUrl: config.get('DATABASE_URL'),
    pgliteDataDir: config.get('PGLITE_DATA_DIR'),
  });
  try {
    await migrateWhenReady(connection);
    logger.log(`Migrations appliquées (${connection.mode})`);
    if (config.get('SEED_DEMO_DATA')) {
      const created = await new SeedDemoTrips(new DrizzleTripRepository(connection.db)).execute();
      logger.log(
        created > 0
          ? `${created} trajets de démonstration chargés dans la base vide`
          : 'La base contient déjà des trajets : aucune donnée de démonstration ajoutée',
      );
    }
  } finally {
    await connection.close();
  }
}

prepareDatabase().catch((error: unknown) => {
  logger.error(error);
  process.exitCode = 1;
});
