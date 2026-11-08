import { describe, expect, it } from 'vitest';
import { normalisePhone } from './phone';

describe('normalisePhone', () => {
  it.each(['77 123 45 67', '77-123-45-67', '+221771234567', '00221 77 123 45 67', ' 771234567 '])(
    '002-AS4: normalises a phone written as %j to 771234567',
    (phone) => {
      expect(normalisePhone(phone)).toBe('771234567');
    },
  );

  it.each(['221771234567', '221 77 123 45 67'])(
    '002-AS4: drops the 221 prefix of a 12-digit phone written as %j',
    (phone) => {
      expect(normalisePhone(phone)).toBe('771234567');
    },
  );

  it('002-AS4: keeps a phone that starts with 221 but does not have 12 digits', () => {
    expect(normalisePhone('221123456')).toBe('221123456');
  });
});
