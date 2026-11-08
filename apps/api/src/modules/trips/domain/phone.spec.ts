import { describe, expect, it } from 'vitest';
import { normalisePhone } from './phone';

describe('normalisePhone', () => {
  it.each(['77 123 45 67', '77-123-45-67', '+221771234567', '00221 77 123 45 67', ' 771234567 '])(
    '002-AS4: normalises a phone written as %j to 771234567',
    (phone) => {
      expect(normalisePhone(phone)).toBe('771234567');
    },
  );
});
