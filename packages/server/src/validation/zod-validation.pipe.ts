import { Injectable, type PipeTransform } from '@nestjs/common';
import { ErrorCode } from '@yazesim/shared/errors';
import type { z } from 'zod';
import { ApiException } from '../errors/api-exception.js';

/** One rejected field: where it is and which rule failed (never the value). */
export interface ValidationIssue {
  readonly path: string;
  readonly code: string;
}

/**
 * Validates a request body, query or parameter against a zod schema from
 * `@yazesim/shared` (CLAUDE.md: every endpoint validates its input with zod).
 * Returns the parsed (typed, transformed) value; on failure answers
 * `VALIDATION_FAILED` with the failing paths and rule codes only, so personal
 * data in the request never reaches the response or the logs.
 */
@Injectable()
export class ZodValidationPipe<Schema extends z.ZodType> implements PipeTransform<
  unknown,
  z.output<Schema>
> {
  constructor(private readonly schema: Schema) {}

  transform(value: unknown): z.output<Schema> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    const issues: ValidationIssue[] = result.error.issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      code: issue.code,
    }));
    throw new ApiException(ErrorCode.VALIDATION_FAILED, { issues });
  }
}
