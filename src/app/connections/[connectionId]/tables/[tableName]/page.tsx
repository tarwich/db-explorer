'use client';

import { InfiniteTable } from '@/components/infinite-table';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { title } from 'radash';
import { useEffect, useRef } from 'react';
import { getRows, getTableInfo } from './actions';

const PAGE_SIZE = 25;
const ROW_HEIGHT = 40;

export default function TablePage({
  params: { connectionId, tableName },
}: {
  params: { connectionId: string; tableName: string };
}) {
  const parentRef = useRef<HTMLDivElement>(null);
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
  const columns: ColumnDef<(typeof allRows)[number]>[] =
    tableInfoQuery.data?.details.columns.map((column) => ({
      id: column.name,
      header: (header) => <div className="text-left">{title(column.name)}</div>,
      accessorKey: column.name,
    })) || [];

  const table = useReactTable({
    data: allRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const virtualizer = useVirtualizer({
    count: table.getRowCount(),
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
  });

  useEffect(() => {
    const lastItem = virtualizer.getVirtualItems().at(-1);

    if (!lastItem) {
      return;
    }

    if (
      lastItem.index >= allRows.length - 1 &&
      rowsQuery.hasNextPage &&
      !rowsQuery.isFetchingNextPage
    ) {
      rowsQuery.fetchNextPage();
    }
  }, [
    rowsQuery.hasNextPage,
    rowsQuery.isFetchingNextPage,
    allRows.length,
    rowsQuery.fetchNextPage,
    virtualizer.getVirtualItems(),
  ]);

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
          isFetchingNextPage={rowsQuery.isFetchingNextPage}
          isLoading={rowsQuery.isLoading}
        />
      </div>
    </div>
  );
}
