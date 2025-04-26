import { singular } from 'pluralize';
import { snake } from 'radash';

export function normalizeName(name: string): string {
  return singular(snake(name).replaceAll('_', ' '));
}
