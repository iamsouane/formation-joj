import { NotFoundException } from '@nestjs/common';
import { createZodDto, ZodValidationException } from 'nestjs-zod';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppError } from './app-error';
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

describe('toProblem', () => {
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
