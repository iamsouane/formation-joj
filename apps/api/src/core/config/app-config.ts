import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  /** Défini : un vrai serveur PostgreSQL. Absent : PGlite, embarqué dans le process. */
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }).optional(),
  /** Dossier des données PGlite, relatif à apps/api ; `memory://` pour une base en mémoire. */
  PGLITE_DATA_DIR: z.string().min(1).default('.data/pglite'),
  /**
   * `true` : l'étape de préparation de la base (`pnpm start`) charge les trajets de démonstration,
   * seulement si la base ne contient encore aucun trajet. Absent : rien n'est chargé.
   */
  SEED_DEMO_DATA: z.stringbool().default(false),
  /** Clé de l'API Claude, qui lit les annonces des conducteurs. Absente : l'assistant est indisponible. */
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

/** Configuration validée une fois, au démarrage : une variable invalide arrête l'API. */
export class AppConfig {
  private constructor(private readonly env: Env) {}

  static fromEnv(source: Record<string, string | undefined>): AppConfig {
    const result = envSchema.safeParse(source);
    if (!result.success) {
      throw new Error(`Configuration invalide :\n${z.prettifyError(result.error)}`);
    }
    return new AppConfig(result.data);
  }

  get<K extends keyof Env>(key: K): Env[K] {
    return this.env[key];
  }
}
