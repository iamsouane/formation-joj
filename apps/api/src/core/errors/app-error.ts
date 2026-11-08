/**
 * Catégorie d'erreur : la seule information que la couche HTTP utilise pour choisir le statut.
 * Le domaine ne connaît pas HTTP.
 */
export type ErrorKind = 'VALIDATION' | 'NOT_FOUND' | 'CONFLICT' | 'BUSINESS_RULE' | 'FORBIDDEN';

/**
 * Base de toutes les erreurs applicatives. Chaque domaine en dérive une classe dont le `code`
 * est une union littérale stable : c'est le contrat lu par les clients.
 */
export abstract class AppError<TCode extends string = string> extends Error {
  protected constructor(
    readonly code: TCode,
    readonly kind: ErrorKind,
    message: string,
    readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
