import { STATUS_CODES } from 'node:http';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ProblemDetails } from '@joj/shared';
import type { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';
import { AppError, type ErrorKind } from './app-error';

const STATUS_BY_KIND: Record<ErrorKind, HttpStatus> = {
  VALIDATION: HttpStatus.BAD_REQUEST,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  BUSINESS_RULE: HttpStatus.UNPROCESSABLE_ENTITY,
  // Un secret (code de gestion…) qui ne correspond pas à la ressource visée.
  FORBIDDEN: HttpStatus.FORBIDDEN,
  // Un service extérieur dont l'application dépend ne répond pas : l'erreur est attendue.
  UNAVAILABLE: HttpStatus.SERVICE_UNAVAILABLE,
};

const INTERNAL_DETAIL = 'An unexpected error occurred.';

/** Seul endroit où une erreur devient une réponse HTTP (RFC 9457, application/problem+json). */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const problem = toProblem(exception);

    // Une erreur inattendue est un bug : on la journalise, sans en montrer le détail au client.
    if (problem.status >= 500) {
      this.logger.error(exception);
    }

    response
      .status(problem.status)
      .type('application/problem+json')
      .json({ ...problem, instance: request.originalUrl.split('?', 1)[0] });
  }
}

export function toProblem(exception: unknown): ProblemDetails {
  if (exception instanceof AppError) {
    return {
      ...base(STATUS_BY_KIND[exception.kind], exception.code),
      detail: exception.message,
      ...(exception.details && { details: exception.details }),
    };
  }

  if (exception instanceof ZodValidationException) {
    const error = exception.getZodError();
    return {
      ...base(HttpStatus.BAD_REQUEST, 'VALIDATION_FAILED'),
      detail: 'The request is invalid.',
      errors:
        error instanceof z.ZodError
          ? error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
          : [],
    };
  }

  // Erreurs levées par Nest lui-même : route inconnue (404), JSON illisible (400)…
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    return {
      ...base(status, HttpStatus[status] ?? 'HTTP_ERROR'),
      detail: status >= 500 ? INTERNAL_DETAIL : exception.message,
    };
  }

  return { ...base(HttpStatus.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR'), detail: INTERNAL_DETAIL };
}

function base(status: number, code: string) {
  return {
    type: `urn:problem-type:${code.toLowerCase().replaceAll('_', '-')}`,
    title: STATUS_CODES[status] ?? 'Error',
    status,
    code,
  };
}
