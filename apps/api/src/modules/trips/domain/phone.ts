const SENEGAL_PREFIX = /^(\+221|00221)/;
/** 221 suivi des 9 chiffres d'un numéro sénégalais, sans + ni 00. */
const BARE_SENEGAL_PREFIX = /^221(?=\d{9}$)/;

/**
 * Lit un téléphone saisi : sans espaces ni tirets, sans préfixe +221 ou 00221, ni 221 devant
 * un numéro de 12 chiffres (« 771234567 »).
 */
export function normalisePhone(phone: string): string {
  return phone.replace(/[\s-]/g, '').replace(SENEGAL_PREFIX, '').replace(BARE_SENEGAL_PREFIX, '');
}
