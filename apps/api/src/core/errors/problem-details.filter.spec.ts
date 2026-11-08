import { NotFoundException } from '@nestjs/common';
import { createZodDto, ZodValidationException } from 'nestjs-zod';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppError } from './app-error';
import { InvalidInputError } from './invalid-input.error';
import { toProblem } from './problem-details.filter';

class SampleError extends AppError<'SAMPLE_TAKEN'> {
  constructor() {
    super('SAMPLE_TAKEN', 'CONFLICT', 'Sample already exists', { name: 'x' });
  }
}

class SampleForbiddenError extends AppError<'SAMPLE_SECRET_INVALID'> {
  constructor() {
    super('SAMPLE_SECRET_INVALID', 'FORBIDDEN', 'Sample secret does not match');
  }
}

class SampleUnavailableError extends AppError<'SAMPLE_SERVICE_DOWN'> {
  constructor() {
    super('SAMPLE_SERVICE_DOWN', 'UNAVAILABLE', 'Sample service is down');
  }
}

describe('toProblem', () => {
  it('maps an UNAVAILABLE error to 503, keeping its code and detail', () => {
    expect(toProblem(new SampleUnavailableError())).toEqual({
      type: 'urn:problem-type:sample-service-down',
      title: 'Service Unavailable',
      status: 503,
      code: 'SAMPLE_SERVICE_DOWN',
      detail: 'Sample service is down',
    });
  });

  it('maps an InvalidInputError to 400 VALIDATION_FAILED, with the invalid fields', () => {
    const result = z.object({ seats: z.int().min(1) }).safeParse({ seats: 0 });
    if (result.success) throw new Error('expected an invalid input');
    expect(toProblem(new InvalidInputError(result.error))).toEqual({
      type: 'urn:problem-type:validation-failed',
      title: 'Bad Request',
      status: 400,
      code: 'VALIDATION_FAILED',
      detail: 'The request is invalid.',
      details: { errors: [{ path: 'seats', message: expect.any(String) }] },
    });
  });

  it('003-AS6: maps a FORBIDDEN error to 403', () => {
    expect(toProblem(new SampleForbiddenError())).toEqual({
      type: 'urn:problem-type:sample-secret-invalid',
      title: 'Forbidden',
      status: 403,
      code: 'SAMPLE_SECRET_INVALID',
      detail: 'Sample secret does not match',
    });
  });

  it('maps an AppError by its kind, with its code and details', () => {
    expect(toProblem(new SampleError())).toEqual({
      type: 'urn:problem-type:sample-taken',
      title: 'Conflict',
      status: 409,
      code: 'SAMPLE_TAKEN',
      detail: 'Sample already exists',
      details: { name: 'x' },
    });
  });

  it('lists the invalid fields of a zod validation error', () => {
    class Dto extends createZodDto(z.object({ name: z.string() })) {}
    const result = Dto.schema.safeParse({});
    const problem = toProblem(new ZodValidationException(result.error));
    expect(problem).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
    expect(problem.errors).toEqual([{ path: 'name', message: expect.any(String) }]);
  });

  it('keeps the status of Nest HTTP exceptions', () => {
    expect(toProblem(new NotFoundException())).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('hides the detail of an unexpected error', () => {
    expect(toProblem(new Error('secret interne'))).toEqual(
      expect.objectContaining({
        status: 500,
        code: 'INTERNAL_ERROR',
        detail: expect.not.stringContaining('secret'),
      }),
    );
  });
});
