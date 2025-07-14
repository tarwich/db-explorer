'use client';

import { getTable, getTableRecords, getTables } from '@/app/api/tables';
import { analyzeTable, getTablesList } from '@/app/api/tables-list';
import { ConnectionModal } from '@/components/connection-modal/connection-modal';
import { RecordEditorModal } from '@/components/record-editor-modal';
import { ItemCardView } from '@/components/explorer/item-views/item-card-view';
import { ItemIcon } from '@/components/explorer/item-views/item-icon';
import { ItemListView } from '@/components/explorer/item-views/item-list-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useResizable } from '@/hooks/use-resizable';
import { cn } from '@/lib/utils';
import { DatabaseTable } from '@/types/connections';
import { useDisclosure } from '@reactuses/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { useEffect, useMemo, useState } from 'react';
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
  const tableConfigModal = useDisclosure();
  const [recordEditorModal, setRecordEditorModal] = useState<{
    isOpen: boolean;
    recordId: any;
  }>({ isOpen: false, recordId: null });
  const { width, startResizing, isResizing, resizerProps } = useResizable({
    initialWidth: 256,
  });

  const connectionQuery = useQuery({
    queryKey: ['connections', params.id],
    queryFn: () => getConnections(),
    select: (data) => data.find((conn) => conn.id === params.id),
  });

  // Fast initial table list (just names and basic info)
  const tablesListQuery = useQuery({
    queryKey: ['connections', params.id, 'tables-list'],
    queryFn: () => getTablesList(params.id),
  });

  // Full table details - only load when a table is selected
  const selectedTableQuery = useQuery({
    queryKey: ['connections', params.id, 'table-details', selectedTable],
    queryFn: () =>
      selectedTable ? getTable(params.id, selectedTable) : null,
    enabled: !!selectedTable,
  });

  const recordsQuery = useQuery({
    queryKey: ['connections', params.id, 'records', selectedTable, page],
    queryFn: () =>
      selectedTable
        ? getTableRecords(params.id, selectedTable, { page, pageSize })
        : null,
    enabled: !!selectedTable,
  });

  const currentTable = selectedTableQuery.data;

  const handleRecordClick = (recordId: any) => {
    setRecordEditorModal({ isOpen: true, recordId });
  };

  const closeRecordEditor = () => {
    setRecordEditorModal({ isOpen: false, recordId: null });
  };

  const fuse = useMemo(() => {
    if (!tablesListQuery.data) return null;
    return new Fuse(tablesListQuery.data, {
      keys: ['name', 'displayName'],
      threshold: 0.3,
    });
  }, [tablesListQuery.data]);

  const filteredTables = useMemo(() => {
    if (!tablesListQuery.data) return [];
    if (!tableFilter || !fuse) return tablesListQuery.data;
    return fuse.search(tableFilter).map((result) => result.item);
  }, [tablesListQuery.data, tableFilter, fuse]);

  // Background analysis of tables
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tablesListQuery.data) return;

    // Find tables that haven't been analyzed yet
    const unanalyzedTables = tablesListQuery.data.filter(
      (table) => !table.isAnalyzed
    );

    if (unanalyzedTables.length === 0) return;

    // Analyze tables in background, one by one to avoid overwhelming the system
    const analyzeTablesSequentially = async () => {
      for (const table of unanalyzedTables) {
        try {
          await analyzeTable(params.id, table.name);

          // Update the table list cache to show this table as analyzed
          queryClient.setQueryData(
            ['connections', params.id, 'tables-list'],
            (oldData: any) => {
              if (!oldData) return oldData;
              return oldData.map((t: any) =>
                t.name === table.name ? { ...t, isAnalyzed: true } : t
              );
            }
          );

          // Small delay to avoid overwhelming the system
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to analyze table ${table.name}:`, error);
        }
      }
    };

    // Start background analysis
    analyzeTablesSequentially();
  }, [tablesListQuery.data, params.id, queryClient]);

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
          {tablesListQuery.data && tablesListQuery.data.length > 10 && (
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
            {tablesListQuery.isLoading ? (
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
                  <ItemIcon item={{ icon: table.icon }} />
                  <span className="truncate flex-1 text-left">
                    {table.displayName}
                  </span>
                  {!table.isAnalyzed && (
                    <div
                      className="w-2 h-2 bg-blue-400 rounded-full"
                      title="Analyzing..."
                    />
                  )}
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
      <div className="flex-1 p-4 flex flex-col min-h-0 overflow-y-auto">
        {selectedTable ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TableIcon
                  className="w-5 h-5 text-emerald-500 cursor-pointer hover:text-emerald-600"
                  onClick={() => tableConfigModal.onOpen()}
                />
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
              <div className="flex-1 min-h-0 overflow-y-auto">
                {/* Grid View */}
                {viewType === 'grid' && (
                  <div className="h-full min-h-0">
                    <GridView
                      table={currentTable}
                      items={recordsQuery.data?.records}
                      onRecordClick={handleRecordClick}
                    />
                  </div>
                )}

                {/* List View */}
                {viewType === 'list' && (
                  <div className="h-full min-h-0">
                    <ListView
                      table={currentTable}
                      items={recordsQuery.data?.records}
                      onRecordClick={handleRecordClick}
                    />
                  </div>
                )}

                {/* Table View */}
                {viewType === 'table' && (
                  <div className="h-full min-h-0">
                    <TableView
                      table={currentTable}
                      items={recordsQuery.data?.records}
                      onRecordClick={handleRecordClick}
                    />
                  </div>
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

      {/* Table Configuration Modal */}
      {tableConfigModal.isOpen && selectedTable && (
        <ConnectionModal
          isOpen={tableConfigModal.isOpen}
          onOpenChange={tableConfigModal.onOpenChange}
          connectionId={params.id}
          initialTableName={selectedTable}
          initialTablePage="general"
        />
      )}

      {/* Record Editor Modal */}
      {recordEditorModal.isOpen && selectedTable && recordEditorModal.recordId && (
        <RecordEditorModal
          isOpen={recordEditorModal.isOpen}
          onClose={closeRecordEditor}
          connectionId={params.id}
          tableName={selectedTable}
          recordId={recordEditorModal.recordId}
        />
      )}
    </div>
  );
}

function GridView({ 
  table, 
  items,
  onRecordClick
}: { 
  table: DatabaseTable; 
  items: any[];
  onRecordClick: (recordId: any) => void;
}) {
  const connectionModal = useDisclosure();
  const columns = useMemo(() => {
    // Get regular columns from view configuration
    const regularColumns = Object.values(table.details.columns).map((c) => ({
      id: c.name,
      name: c.name,
      displayName: c.displayName,
      icon: c.icon,
      type: c.type,
      hidden: table.details.cardView.columns[c.name]?.hidden ?? c.hidden,
      order: table.details.cardView.columns[c.name]?.order ?? 0,
      calculated: false,
    }));

    // Get calculated columns from view configuration
    const calculatedColumns = (table.details.calculatedColumns || []).map(
      (c: any) => ({
        id: `calc_${c.id}`,
        name: c.name,
        displayName: c.displayName,
        icon: c.icon,
        type: 'calculated',
        hidden:
          table.details.cardView.columns[`calc_${c.id}`]?.hidden ?? c.hidden,
        order: table.details.cardView.columns[`calc_${c.id}`]?.order ?? c.order,
        calculated: true,
      })
    );

    // Combine and sort all columns
    const allColumns = [...regularColumns, ...calculatedColumns];
    return sort(allColumns, (c: any) => c.order).filter((c: any) => !c.hidden);
  }, [table]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {items.map((record: any) => (
        <div
          key={record.id}
          className="cursor-pointer"
          onClick={() => onRecordClick(record.id)}
        >
          <ItemCardView
            item={{
              id: record.id,
            icon: table.details.icon,
            columns: columns.map((c) => {
              const val = record[c.id];
              if (
                val &&
                typeof val === 'object' &&
                'value' in val &&
                'icon' in val
              ) {
                return {
                  name: c.displayName,
                  value: val.value,
                  icon: val.icon,
                };
              }
              return {
                name: c.displayName,
                value: String(val),
              };
            }),
          }}
        />
        </div>
      ))}
      {connectionModal.isOpen && (
        <ConnectionModal
          isOpen={connectionModal.isOpen}
          onOpenChange={connectionModal.onOpenChange}
          connectionId={table.connectionId}
          initialTableName={table.name}
          initialTablePage="card-view"
        />
      )}
    </div>
  );
}

function ListView({ 
  table, 
  items,
  onRecordClick
}: { 
  table: DatabaseTable; 
  items: any[];
  onRecordClick: (recordId: any) => void;
}) {
  const connectionModal = useDisclosure();
  const columns = useMemo(() => {
    // Get regular columns from view configuration
    const regularColumns = Object.values(table.details.columns).map((c) => ({
      id: c.name,
      name: c.name,
      displayName: c.displayName,
      icon: c.icon,
      type: c.type,
      hidden: table.details.listView.columns[c.name]?.hidden ?? c.hidden,
      order: table.details.listView.columns[c.name]?.order ?? 0,
      calculated: false,
    }));

    // Get calculated columns from view configuration
    const calculatedColumns = (table.details.calculatedColumns || []).map(
      (c: any) => ({
        id: `calc_${c.id}`,
        name: c.name,
        displayName: c.displayName,
        icon: c.icon,
        type: 'calculated',
        hidden:
          table.details.listView.columns[`calc_${c.id}`]?.hidden ?? c.hidden,
        order: table.details.listView.columns[`calc_${c.id}`]?.order ?? c.order,
        calculated: true,
      })
    );

    // Combine and sort all columns
    const allColumns = [...regularColumns, ...calculatedColumns];
    return sort(allColumns, (c: any) => c.order).filter((c: any) => !c.hidden);
  }, [table]);

  return (
    <div className="space-y-2">
      {items.map((record: any) => (
        <div
          key={record.id}
          className="cursor-pointer"
          onClick={() => onRecordClick(record.id)}
        >
          <ItemListView
            item={{
              id: record.id,
            icon: table.details.icon,
            columns: columns.map((c) => {
              const val = record[c.id];
              if (
                val &&
                typeof val === 'object' &&
                'value' in val &&
                'icon' in val
              ) {
                return {
                  name: c.displayName,
                  value: val.value,
                  icon: val.icon,
                };
              }
              return {
                name: c.displayName,
                value: String(val),
              };
            }),
          }}
        />
        </div>
      ))}
      {connectionModal.isOpen && (
        <ConnectionModal
          isOpen={connectionModal.isOpen}
          onOpenChange={connectionModal.onOpenChange}
          connectionId={table.connectionId}
          initialTableName={table.name}
          initialTablePage="list-view"
        />
      )}
    </div>
  );
}

function TableView({ 
  table, 
  items,
  onRecordClick
}: { 
  table: DatabaseTable; 
  items: any[];
  onRecordClick: (recordId: any) => void;
}) {
  const connectionModal = useDisclosure();
  const columns = useMemo(() => {
    const { mergeColumnsForDisplay } = require('@/utils/calculated-columns');

    // Get regular columns
    const regularColumns = sort(
      Object.entries(table.details.columns),
      ([, c]: any) => c.order
    )
      .filter(([, c]: any) => !c.hidden)
      .map(([name]) => table.details.columns[name])
      .filter(Boolean);

    // Merge with calculated columns
    const allColumns = mergeColumnsForDisplay(
      regularColumns,
      table.details.calculatedColumns || []
    );

    return allColumns.filter((col: any) => !col.hidden);
  }, [table]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            {columns.map((column: any) => (
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
              onClick={() => onRecordClick(record.id)}
            >
              {columns.map((column: any) => {
                const val = record[column.name];
                if (
                  val &&
                  typeof val === 'object' &&
                  'value' in val &&
                  'icon' in val
                ) {
                  return (
                    <td
                      key={column.name}
                      className="px-4 py-2 text-sm flex items-center gap-1"
                    >
                      <ItemIcon item={{ icon: val.icon }} />
                      {val.value}
                    </td>
                  );
                }
                return (
                  <td key={column.name} className="px-4 py-2 text-sm">
                    {String(val)}
                  </td>
                );
              })}
              <td className="px-2 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRecordClick(record.id);
                  }}
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
          initialTableName={table.name}
        />
      )}
    </div>
  );
}
