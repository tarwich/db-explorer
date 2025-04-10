'use client';

import { InfiniteTable } from '@/components/infinite-table';
import { Input } from '@/components/ui/input';
import { useRecordEditorSidebar } from '@/context/editor-sidebar-context';
import { KeyIcon, LinkIcon } from '@heroicons/react/24/outline';
import { useDebounce } from '@reactuses/core';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { title } from 'radash';
import { useState } from 'react';
import { getRows, getTableInfo } from './actions';

const PAGE_SIZE = 100;

export default function TablePage({
  params: { connectionId, tableName },
}: {
  params: { connectionId: string; tableName: string };
}) {
  const sidebar = useRecordEditorSidebar();
  const [filterInput, setFilterInput] = useState('');
  const debouncedFilter = useDebounce(filterInput, 300);

  // Fetch table info
  const tableInfoQuery = useQuery({
    queryKey: ['connection', connectionId, 'table', tableName],
    queryFn: () => getTableInfo({ connectionId, tableName }),
  });

  // Fetch rows with infinite scrolling
  const rowsQuery = useInfiniteQuery({
    queryKey: [
      'connection',
      connectionId,
      'table',
      tableName,
      'rows',
      { filter: debouncedFilter },
    ],
    queryFn: ({ pageParam = 1 }) =>
      getRows({
        connectionId,
        tableName,
        filter: debouncedFilter,
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
      header: () => (
        <div className="text-left uppercase text-xs">
          {tableInfoQuery.data?.details.pk.includes(column.name) && (
            <KeyIcon className="icon-pk w-4 h-4 inline-block mr-2" />
          )}
          {title(column.name)}
          {column.foreignKey && (
            <LinkIcon className="icon-fk w-4 h-4 inline-block ml-2" />
          )}
        </div>
      ),
      accessorKey: column.name,
    })) || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none p-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 capitalize">
          {tableInfoQuery.data?.name}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Showing {allRows.length} records from the table
        </p>
        <div className="mt-4">
          <Input
            type="text"
            placeholder="Filter records..."
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
            className="max-w-md"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 px-8 pb-8 min-h-0">
        <InfiniteTable
          className="h-full"
          columns={columns}
          data={allRows}
          fetchNextPage={rowsQuery.fetchNextPage}
          hasNextPage={rowsQuery.hasNextPage}
          isFetchingNextPage={rowsQuery.isFetchingNextPage}
          isLoading={rowsQuery.isLoading}
          onRowClick={(row) => sidebar.openEditor(tableName, row.id)}
        />
      </div>
    </div>
  );
}
