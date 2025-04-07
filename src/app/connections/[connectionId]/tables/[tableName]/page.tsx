'use client';

import { InfiniteTable } from '@/components/infinite-table';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { capitalCase } from 'change-case';
import { getRows, getTableInfo } from './actions';

const PAGE_SIZE = 25;

export default function TablePage({
  params: { connectionId, tableName },
}: {
  params: { connectionId: string; tableName: string };
}) {
  // Fetch table info
  const tableInfoQuery = useQuery({
    queryKey: ['tableInfo', connectionId, tableName],
    queryFn: () => getTableInfo({ connectionId, tableName }),
  });

  // Fetch rows with infinite scrolling
  const rowsQuery = useInfiniteQuery({
    queryKey: ['tableRows', connectionId, tableName],
    queryFn: ({ pageParam = 1 }) =>
      getRows({
        connectionId,
        tableName,
        page: pageParam,
        pageSize: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length + 1;
    },
    initialPageParam: 1,
  });

  // Flatten all pages of data
  const allRows = rowsQuery.data?.pages.flat() || [];

  // Define columns based on the first row
  const columns: ColumnDef<any>[] = Object.keys(allRows[0] || {}).map(
    (key) => ({
      accessorKey: key,
      header: () => {
        const isPrimaryKey = tableInfoQuery.data?.details?.pk?.includes(key);
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
            (allRows[0]?.[key]?.toString() || '').length * 8, // Sample first row content
            200 // Max width
          )
        ),
        200 // Enforce max width
      ),
    })
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none p-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {tableInfoQuery.data?.name}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Showing {allRows.length} records from the table
        </p>
      </div>

      {/* Table Container */}
      <div className="flex-1 px-8 pb-8 min-h-0">
        <InfiniteTable
          columns={columns}
          data={allRows}
          fetchNextPage={rowsQuery.fetchNextPage}
          hasNextPage={rowsQuery.hasNextPage}
          isLoading={rowsQuery.isLoading}
          isFetchingNextPage={rowsQuery.isFetchingNextPage}
        />
      </div>
    </div>
  );
}
