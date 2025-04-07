import { DeserializedTable } from '@/types/connections';

/** Common meaningful column names that are good for display   */
const COMMON_DISPLAY_COLUMNS = ['name', 'title', 'label', 'description'];

/** Text-based data types that are suitable for display */
const TEXT_TYPES = [
  'character varying',
  'varchar',
  'text',
  'char',
  'character',
];

/**
 * Determines which columns should be used for displaying records in a table
 * @param columns The table's columns
 * @param primaryKey The table's primary key columns
 * @returns Array of column names to use for displaying records
 */
export function determineDisplayColumns(table: DeserializedTable): string[] {
  const columns = table.details.columns;
  const primaryKey = table.details.pk;

  // First, look for common meaningful column names
  for (const colName of COMMON_DISPLAY_COLUMNS) {
    const column = columns.find((c) => c.name === colName);
    if (column) {
      return [column.name];
    }
  }

  // Next, look for common name patterns (first name + last name)
  const firstNameColumn = columns.find(
    (c) => c.normalizedName === 'first name'
  );
  const lastNameColumn = columns.find((c) => c.normalizedName === 'last name');
  if (firstNameColumn && lastNameColumn) {
    return [firstNameColumn.name, lastNameColumn.name];
  }

  // Look for email columns
  const emailColumn = columns.find((c) => c.normalizedName.startsWith('email'));
  if (emailColumn) {
    return [emailColumn.name];
  }

  // Find the first text-type column that isn't a primary key or named 'id'
  const textColumn = columns.find(
    (col) =>
      TEXT_TYPES.includes(col.type.toLowerCase()) &&
      !primaryKey?.includes(col.name) &&
      !['id', 'uuid', 'guid', 'pk'].includes(col.normalizedName)
  );
  if (textColumn) {
    return [textColumn.name];
  }

  // Fallback to primary key if nothing else is suitable
  if (primaryKey?.length) {
    return [primaryKey[0]];
  }

  // Last resort: use the first column
  return [columns[0].name];
}
