import { describe, expect, it } from 'vitest';
import { parseVerifyArgs, selectSteps, VERIFY_STEPS } from './verify-steps.ts';

describe('verify steps', () => {
  it('runs everything by default and only the core checks with --quick', () => {
    expect(selectSteps(parseVerifyArgs([]))).toEqual(VERIFY_STEPS);
    const quick = selectSteps(parseVerifyArgs(['--quick']));
    expect(quick.length).toBeGreaterThan(0);
    expect(quick.every((step) => step.group === 'core')).toBe(true);
  });

  it('starts with the secret scan and the repository guard', () => {
    expect(VERIFY_STEPS[0]?.command).toBe('gitleaks');
    expect(VERIFY_STEPS[1]?.args).toEqual(['repo:guard']);
  });

  it('rejects unknown options', () => {
    expect(() => parseVerifyArgs(['--fast'])).toThrow(/--fast/u);
  });
});
