import { CalculatedColumn } from '@/types/connections';

/**
 * Evaluates a calculated column template with data from a record
 * @param template - The template string (e.g., "{first_name} {last_name}")
 * @param record - The data record containing column values
 * @returns The evaluated string
 */
export function evaluateCalculatedColumn(
  template: string,
  record: Record<string, any>
): string {
  // Replace placeholders like {column_name} with actual values
  return template.replace(/\{([^}]+)\}/g, (match, columnName) => {
    const value = record[columnName.trim()];

    // Handle different value types
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'object' && 'value' in value) {
      // Handle foreign key objects that have been resolved
      return String(value.value || '');
    }

    return String(value).trim();
  });
}

/**
 * Processes records by adding calculated columns to each record
 * @param records - Array of data records
 * @param calculatedColumns - Array of calculated column definitions
 * @returns Records with calculated column values added
 */
export function addCalculatedColumnsToRecords(
  records: Record<string, any>[],
  calculatedColumns: CalculatedColumn[]
): Record<string, any>[] {
  if (!calculatedColumns || calculatedColumns.length === 0) {
    return records;
  }

  return records.map((record) => {
    const enrichedRecord = { ...record };

    calculatedColumns.forEach((calcColumn) => {
      if (!calcColumn.hidden) {
        // Use the same key format as used in view components: calc_{id}
        const calcColumnKey = `calc_${calcColumn.id}`;
        enrichedRecord[calcColumnKey] = evaluateCalculatedColumn(
          calcColumn.template,
          record
        );
      }
    });

    return enrichedRecord;
  });
}

/**
 * Merges calculated columns with regular columns for display
 * @param regularColumns - Regular database columns
 * @param calculatedColumns - Calculated column definitions
 * @returns Combined array of columns for display
 */
export function mergeColumnsForDisplay(
  regularColumns: Array<{
    name: string;
    displayName: string;
    icon: string;
    type: string;
    hidden: boolean;
    order: number;
  }>,
  calculatedColumns: CalculatedColumn[]
): Array<{
  name: string;
  displayName: string;
  icon: string;
  type: string;
  hidden: boolean;
  order: number;
  isCalculated?: boolean;
}> {
  const allColumns = [
    ...regularColumns.map((col) => ({ ...col, isCalculated: false })),
    ...calculatedColumns.map((col) => ({
      name: `calc_${col.id}`, // Use consistent key format
      displayName: col.displayName,
      icon: col.icon,
      type: 'calculated',
      hidden: col.hidden,
      order: col.order,
      isCalculated: true,
    })),
  ];

  // Sort by order
  return allColumns.sort((a, b) => a.order - b.order);
}
