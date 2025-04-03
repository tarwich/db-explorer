import { TableColumn } from '@/stores/database';

interface TableDataViewProps {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  totalRows: number;
  isLoading: boolean;
}

export function TableDataView({
  columns,
  rows,
  totalRows,
  isLoading,
}: TableDataViewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="mb-4 text-sm text-gray-600">
        Showing {rows.length} of {totalRows} rows
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.column_name}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap max-w-xs"
                title={`Type: ${column.data_type}${
                  column.is_nullable === 'YES' ? ', Nullable' : ''
                }`}
              >
                <div className="truncate">{column.column_name}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => {
                const value = formatCellValue(row[column.column_name]);
                return (
                  <td
                    key={column.column_name}
                    className="px-6 py-4 text-sm text-gray-900 max-w-xs"
                  >
                    <div className="truncate" title={value}>
                      {value}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null) return 'NULL';
  if (value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
