import { noCase } from 'change-case';
import pluralize from 'pluralize';

export function normalizeName(name: string): string {
  return pluralize.singular(noCase(name));
}
