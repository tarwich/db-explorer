export function getRecordDisplayValue(record: any): string {
  // Try to find a meaningful display value
  const displayFields = ['name', 'title', 'email', 'firstName', 'first_name'];
  for (const field of displayFields) {
    if (record[field]) {
      return String(record[field]);
    }
  }
  // Fallback to first non-id, non-timestamp field
  const keys = Object.keys(record).filter(key =>
    !key.toLowerCase().includes('id') &&
    !key.toLowerCase().includes('created') &&
    !key.toLowerCase().includes('updated')
  );
  if (keys.length > 0 && record[keys[0]]) {
    return String(record[keys[0]]);
  }
  return `Record ${record.id}`;
}

export function formatDateTimeLocal(value: any): string {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

export function formatDate(value: any): string {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}
