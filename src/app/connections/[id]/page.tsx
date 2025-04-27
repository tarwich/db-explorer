'use client';

import { getTableRecords, getTables } from '@/app/api/tables';
import { ConnectionModal } from '@/components/connection-modal/connection-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useResizable } from '@/hooks/use-resizable';
import { cn } from '@/lib/utils';
import { DatabaseTable } from '@/types/connections';
import { useDisclosure } from '@reactuses/core';
import { useQuery } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import {
  ArrowLeft,
  LayoutGrid,
  List,
  MoreVertical,
  Plus,
  Search,
  Table as TableIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { sort } from 'radash';
import { useMemo, useState } from 'react';
import { getConnections } from '../../api/connections';

type ViewType = 'grid' | 'list' | 'table';

export default function DataBrowserPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTable = searchParams.get('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [viewType, setViewType] = useState<ViewType>('grid');
  const { width, startResizing, isResizing, resizerProps } = useResizable({
    initialWidth: 256,
  });

  const connectionQuery = useQuery({
    queryKey: ['connections', params.id],
    queryFn: () => getConnections(),
    select: (data) => data.find((conn) => conn.id === params.id),
  });

  const tablesQuery = useQuery({
    queryKey: ['tables', params.id],
    queryFn: () => getTables(params.id),
  });

  const recordsQuery = useQuery({
    queryKey: ['records', params.id, selectedTable, page],
    queryFn: () =>
      selectedTable
        ? getTableRecords(params.id, selectedTable, { page, pageSize })
        : null,
    enabled: !!selectedTable,
  });

  const currentTable = tablesQuery.data?.find((t) => t.name === selectedTable);

  const fuse = useMemo(() => {
    if (!tablesQuery.data) return null;
    return new Fuse(tablesQuery.data, {
      keys: ['name', 'details.pluralName', 'details.singularName'],
      threshold: 0.3,
    });
  }, [tablesQuery.data]);

  const filteredTables = useMemo(() => {
    if (!tablesQuery.data) return [];
    if (!tableFilter || !fuse) return tablesQuery.data;
    return fuse.search(tableFilter).map((result) => result.item);
  }, [tablesQuery.data, tableFilter, fuse]);

  return (
    <div
      className={cn(
        'min-h-screen bg-gray-50 flex flex-row h-full overflow-hidden',
        isResizing && 'select-none'
      )}
    >
      {/* Sidebar */}
      <div
        className="bg-white border-r flex flex-col h-screen flex-none"
        style={{ width }}
      >
        {/* Connection Info */}
        <div className="p-4 border-b flex-none">
          <Link
            href="/connections"
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Connections</span>
          </Link>
          <div className="text-sm text-gray-500">
            {connectionQuery.data?.name}
          </div>
        </div>

        {/* Tables List */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="text-sm font-medium mb-2">Tables</div>
          {tablesQuery.data && tablesQuery.data.length > 10 && (
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-8 h-8 text-sm"
                placeholder="Filter tables..."
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1">
            {tablesQuery.isLoading ? (
              <div className="text-sm text-gray-500">Loading tables...</div>
            ) : (
              filteredTables.map((table) => (
                <button
                  key={table.name}
                  onClick={() => {
                    setPage(1);
                    router.push(
                      `/connections/${params.id}?table=${table.name}`
                    );
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm',
                    selectedTable === table.name
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <TableIcon className="w-4 h-4 flex-0" />
                  <span className="truncate flex-1 text-left">
                    {table.details.pluralName}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div className="relative">
        <div
          {...resizerProps}
          className={cn(
            resizerProps.className,
            'w-2 cursor-col-resize hover:bg-gray-200'
          )}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col overflow-y-hidden">
        {selectedTable ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TableIcon className="w-5 h-5 text-emerald-500" />
                <h1 className="text-xl font-semibold">
                  {currentTable?.details.pluralName}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    className="pl-9 w-64"
                    placeholder="Search records"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button className="gap-1">
                  <Plus className="w-4 h-4" />
                  New Record
                </Button>
              </div>
            </div>

            {/* View Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium">
                {recordsQuery.data?.pagination.total} Records
              </div>
              <div className="flex items-center gap-1 bg-white rounded-lg border p-1">
                <Button
                  variant={viewType === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setViewType('grid')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewType === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setViewType('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewType === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setViewType('table')}
                >
                  <TableIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Loading State */}
            {recordsQuery.isLoading && (
              <div className="flex items-center justify-center py-8 text-gray-500">
                Loading records...
              </div>
            )}

            {/* Error State */}
            {recordsQuery.isError && (
              <div className="flex items-center justify-center py-8 text-red-500">
                Error loading records. Please try again.
              </div>
            )}

            {/* Empty State */}
            {!recordsQuery.data?.records.length && (
              <div className="flex items-center justify-center py-8 text-gray-500">
                No records found in this table.
              </div>
            )}

            {/* Records Display */}
            {currentTable && !!recordsQuery.data?.records?.length && (
              <div className="flex-1 overflow-y-auto">
                {/* Grid View */}
                {viewType === 'grid' && (
                  <ItemGridView
                    table={currentTable}
                    items={recordsQuery.data?.records}
                  />
                )}

                {/* List View */}
                {viewType === 'list' && (
                  <ItemListView
                    table={currentTable}
                    items={recordsQuery.data?.records}
                  />
                )}

                {/* Table View */}
                {viewType === 'table' && (
                  <ItemTableView
                    table={currentTable}
                    items={recordsQuery.data?.records}
                  />
                )}
              </div>
            )}

            {/* Pagination */}
            {(recordsQuery.data?.pagination?.totalPages ?? 0) > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="text-sm text-gray-500">
                  Page {page} of{' '}
                  {recordsQuery.data?.pagination?.totalPages ?? 1}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) =>
                      Math.min(
                        recordsQuery.data?.pagination?.totalPages ?? 1,
                        p + 1
                      )
                    )
                  }
                  disabled={
                    page === (recordsQuery.data?.pagination?.totalPages ?? 1)
                  }
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a table to view its records
          </div>
        )}
      </div>
    </div>
  );
}

function ItemGridView({
  table,
  items,
}: {
  table: DatabaseTable;
  items: any[];
}) {
  const connectionModal = useDisclosure();
  const columns = useMemo(() => {
    return sort(
      Object.entries(table.details.cardView.columns),
      ([, c]) => c.order
    )
      .filter(([, c]) => !c.hidden)
      .map(([name]) => table.details.columns[name]);
  }, [table]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {items.map((record: any) => (
        <div
          key={record.id}
          className="bg-white rounded-lg border p-4 cursor-pointer hover:border-gray-300 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-sm">
              <TableIcon className="w-3 h-3" />
              {table.details.singularName}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={connectionModal.onOpen}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {columns.map((column) => (
              <div key={column.name}>
                <div className="font-medium">{String(record[column.name])}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {connectionModal.isOpen && (
        <ConnectionModal
          isOpen={connectionModal.isOpen}
          onOpenChange={connectionModal.onOpenChange}
          connectionId={table.connectionId}
          initialTableName={table.name}
        />
      )}
    </div>
  );
}

function ItemListView({
  table,
  items,
}: {
  table: DatabaseTable;
  items: any[];
}) {
  const connectionModal = useDisclosure();
  const columns = useMemo(() => {
    return sort(
      Object.entries(table.details.listView.columns),
      ([, c]) => c.order
    )
      .filter(([, c]) => !c.hidden)
      .map(([name]) => table.details.columns[name]);
  }, [table]);

  return (
    <div className="space-y-2">
      {items.map((record: any) => (
        <div
          key={record.id}
          className="bg-white rounded-lg border p-4 flex items-center gap-4 cursor-pointer hover:border-gray-300 transition-colors"
        >
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-sm">
            <TableIcon className="w-3 h-3" />
            {table.details.singularName}
          </div>
          <div className="flex-1 flex items-center gap-4">
            {columns.map((column) => (
              <div key={column.name} className="min-w-[120px]">
                <div className="text-sm text-gray-500">
                  {column.displayName}
                </div>
                <div className="font-medium truncate">
                  {String(record[column.name])}
                </div>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 flex-none"
            onClick={connectionModal.onOpen}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      ))}
      {connectionModal.isOpen && (
        <ConnectionModal
          isOpen={connectionModal.isOpen}
          onOpenChange={connectionModal.onOpenChange}
          connectionId={table.connectionId}
        />
      )}
    </div>
  );
}

function ItemTableView({
  table,
  items,
}: {
  table: DatabaseTable;
  items: any[];
}) {
  const connectionModal = useDisclosure();
  const columns = useMemo(() => {
    return sort(Object.entries(table.details.columns), ([, c]) => c.order)
      .filter(([, c]) => !c.hidden)
      .map(([name]) => table.details.columns[name]);
  }, [table]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            {columns.map((column) => (
              <th
                key={column.name}
                className="px-4 py-2 text-left text-sm font-medium text-gray-900"
              >
                {column.displayName}
              </th>
            ))}
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y">
          {items.map((record: any) => (
            <tr
              key={record.id}
              className="cursor-pointer hover:bg-gray-50"
              onClick={connectionModal.onOpen}
            >
              {columns.map((column) => (
                <td key={column.name} className="px-4 py-2 text-sm">
                  {String(record[column.name])}
                </td>
              ))}
              <td className="px-2 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={connectionModal.onOpen}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {connectionModal.isOpen && (
        <ConnectionModal
          isOpen={connectionModal.isOpen}
          onOpenChange={connectionModal.onOpenChange}
          connectionId={table.connectionId}
        />
      )}
    </div>
  );
}
