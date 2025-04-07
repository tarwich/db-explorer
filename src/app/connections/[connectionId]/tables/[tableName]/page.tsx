'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { capitalCase } from 'change-case';
import { useEffect, useState } from 'react';
import { getRows, getTableInfo } from './actions';

export default function TablePage({
  params: { connectionId, tableName },
}: {
  params: { connectionId: string; tableName: string };
}) {
  const [tableInfo, setTableInfo] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [tableInfoData, rowsData] = await Promise.all([
          getTableInfo({
            connectionId,
            tableName,
          }),
          getRows({
            connectionId,
            tableName,
            page: 1,
            pageSize: 10,
          }),
        ]);

        setTableInfo(tableInfoData);
        setRows(rowsData);
      } catch (error) {
        console.error('Error loading table data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [connectionId, tableName]);

  const columns: ColumnDef<any>[] = Object.keys(rows[0] || {}).map((key) => ({
    accessorKey: key,
    header: () => {
      const isPrimaryKey = tableInfo?.details?.pk?.includes(key);
      return (
        <div
          className="flex items-center gap-1 text-left font-medium truncate"
          title={capitalCase(key)}
        >
          <span>{capitalCase(key)}</span>
          {isPrimaryKey && (
            <span title="Primary Key" className="text-yellow-500">
              🔑
            </span>
          )}
        </div>
      );
    },
    cell: ({ row }) => {
      const value = row.getValue(key)?.toString() || 'null';
      return (
        <div className="text-left truncate max-w-[200px]" title={value}>
          {value}
        </div>
      );
    },
    size: Math.min(
      Math.max(
        key.length * 8, // Base width on column name
        Math.min(
          (rows[0]?.[key]?.toString() || '').length * 8, // Sample first row content
          200 // Max width
        )
      ),
      200 // Enforce max width
    ),
  }));

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none p-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">{tableInfo?.name}</h1>
        <p className="mt-2 text-sm text-gray-600">
          Showing {rows.length} records from the table
        </p>
      </div>

      {/* Table Container */}
      <div className="flex-1 px-8 pb-8 min-h-0">
        <div className="rounded-md border max-h-full flex flex-col">
          <div className="flex-1 h-full overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        style={{
                          width: header.getSize(),
                          maxWidth: 200,
                        }}
                        className="whitespace-nowrap"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          style={{
                            width: cell.column.getSize(),
                            maxWidth: 200,
                          }}
                          className="whitespace-nowrap"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
