/**
 * Les matchers de jest-dom (`toBeInTheDocument`, `toHaveTextContent`…) pour le typage. Le fichier
 * `@testing-library/jest-dom/vitest` les déclare sur `Assertion<T>`, alors que vitest 5 l'écrit
 * `Assertion<R, T>` : sa déclaration ne s'applique plus. Vitest 5 prévoit `Matchers<R, T>` pour cela.
 */
import 'vitest';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module 'vitest' {
  interface Matchers<
    R extends void | Promise<void> = void | Promise<void>,
    T = unknown,
  > extends TestingLibraryMatchers<unknown, R> {}
}
