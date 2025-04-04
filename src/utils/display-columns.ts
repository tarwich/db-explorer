import { TableColumn } from '@/stores/database';

/**
 * Determines which columns should be used for displaying records in a table
 * @param columns The table's columns
 * @param primaryKey The table's primary key columns
 * @returns Array of column names to use for displaying records
 */
export function determineDisplayColumns(
  columns: TableColumn[],
  primaryKey?: string[]
): string[] {
  // Common meaningful column names that are good for display
  const commonDisplayColumns = ['name', 'title', 'label', 'description'];

  // Text-based data types that are suitable for display
  const textTypes = [
    'character varying',
    'varchar',
    'text',
    'char',
    'character',
  ];

  // First, look for common meaningful column names
  for (const colName of commonDisplayColumns) {
    const column = columns.find((c) => c.normalizedName === colName);
    if (column) {
      return [column.column_name];
    }
  }

  // Next, look for common name patterns (first name + last name)
  const firstNameColumn = columns.find(
    (c) => c.normalizedName === 'first name'
  );
  const lastNameColumn = columns.find((c) => c.normalizedName === 'last name');
  if (firstNameColumn && lastNameColumn) {
    return [firstNameColumn.column_name, lastNameColumn.column_name];
  }

  // Look for email columns
  const emailColumn = columns.find((c) => c.normalizedName.startsWith('email'));
  if (emailColumn) {
    return [emailColumn.column_name];
  }

  // Find the first text-type column that isn't a primary key or named 'id'
  const textColumn = columns.find(
    (col) =>
      textTypes.includes(col.data_type.toLowerCase()) &&
      !primaryKey?.includes(col.column_name) &&
      !['id', 'uuid', 'guid', 'pk'].includes(col.normalizedName)
  );
  if (textColumn) {
    return [textColumn.column_name];
  }

  // Fallback to primary key if nothing else is suitable
  if (primaryKey?.length) {
    return [primaryKey[0]];
  }

  // Last resort: use the first column
  return [columns[0].column_name];
}
