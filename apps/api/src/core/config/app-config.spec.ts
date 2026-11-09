import { describe, expect, it } from 'vitest';
import { AppConfig } from './app-config';

describe('AppConfig', () => {
  it('works without any variable: PGlite on port 3000', () => {
    const config = AppConfig.fromEnv({});
    expect(config.get('PORT')).toBe(3000);
    expect(config.get('DATABASE_URL')).toBeUndefined();
    expect(config.get('PGLITE_DATA_DIR')).toBe('.data/pglite');
  });

  it('seeds the demo data only when asked to', () => {
    expect(AppConfig.fromEnv({}).get('SEED_DEMO_DATA')).toBe(false);
    expect(AppConfig.fromEnv({ SEED_DEMO_DATA: 'true' }).get('SEED_DEMO_DATA')).toBe(true);
    expect(AppConfig.fromEnv({ SEED_DEMO_DATA: 'false' }).get('SEED_DEMO_DATA')).toBe(false);
  });

  it('accepts a PostgreSQL URL', () => {
    const config = AppConfig.fromEnv({ DATABASE_URL: 'postgres://joj:joj@localhost:5432/joj' });
    expect(config.get('DATABASE_URL')).toBe('postgres://joj:joj@localhost:5432/joj');
  });

  it('rejects an invalid value at startup and names the variable', () => {
    expect(() => AppConfig.fromEnv({ PORT: 'abc' })).toThrow(/PORT/);
    expect(() => AppConfig.fromEnv({ DATABASE_URL: 'mysql://localhost' })).toThrow(/DATABASE_URL/);
  });
});
