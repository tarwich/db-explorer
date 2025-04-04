import { singular } from 'pluralize';
import { noCase } from 'change-case';

export function normalizeName(name: string): string {
  return singular(noCase(name));
}
