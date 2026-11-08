const SENEGAL_PREFIX = /^(\+221|00221)/;

/** Lit un téléphone saisi : sans espaces ni tirets, sans préfixe +221 ou 00221 (« 771234567 »). */
export function normalisePhone(phone: string): string {
  return phone.replace(/[\s-]/g, '').replace(SENEGAL_PREFIX, '');
}
