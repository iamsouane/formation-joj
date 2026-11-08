import type { z } from 'zod';
import { AppError } from './app-error';

/**
 * Une donnée invalide qui n'arrive pas par le corps de la requête (par exemple ce qu'un service
 * extérieur a produit) : le même refus 400 VALIDATION_FAILED qu'une saisie invalide.
 */
export class InvalidInputError extends AppError<'VALIDATION_FAILED'> {
  constructor(error: z.ZodError) {
    super('VALIDATION_FAILED', 'VALIDATION', 'The request is invalid.', {
      errors: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
}
