'use client';

import { analyzeTable, getTablesList } from '@/app/api/tables-list';
import { ItemIcon } from '@/components/explorer/item-views/item-icon';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useResizable } from '@/hooks/use-resizable';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

interface DatabaseSidebarProps {
  connectionId: string;
  connectionName?: string;
  selectedTable?: string | null;
  onTableSelect: (tableName: string) => void;
  onResetPage: () => void;
}

export function DatabaseSidebar({
  connectionId,
  connectionName,
  selectedTable,
  onTableSelect,
  onResetPage,
}: DatabaseSidebarProps) {
  const [tableFilter, setTableFilter] = useState('');
  const { width, resizerProps, isResizing } = useResizable({
    initialWidth: 256,
  });

  const tablesListQuery = useQuery({
    queryKey: ['connections', connectionId, 'tables-list'],
    queryFn: () => getTablesList(connectionId),
  });

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
          await analyzeTable(connectionId, table.name);

          // Update the table list cache to show this table as analyzed
          queryClient.setQueryData(
            ['connections', connectionId, 'tables-list'],
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
  }, [tablesListQuery.data, connectionId, queryClient]);

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

  const handleTableClick = (tableName: string) => {
    onResetPage();
    onTableSelect(tableName);
  };

  return (
    <>
      <div
        className={cn(
          'bg-white border-r flex flex-col h-screen flex-none',
          isResizing && 'select-none'
        )}
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
          <div className="text-sm text-gray-500">{connectionName}</div>
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
                  onClick={() => handleTableClick(table.name)}
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
    </>
  );
}