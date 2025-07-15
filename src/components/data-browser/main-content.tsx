'use client';

import { getTable, getTableRecordsInfinite } from '@/app/api/tables';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatabaseTable } from '@/types/connections';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  Table as TableIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';
import { GridView } from './grid-view';
import { ListView } from './list-view';
import { TableView } from './table-view';

type ViewType = 'grid' | 'list' | 'table';

interface MainContentProps {
  connectionId: string;
  selectedTable: string | null;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  viewType: ViewType;
  onViewTypeChange: (viewType: ViewType) => void;
  onRecordClick: (recordId: any) => void;
  onTableConfigClick: () => void;
}

export function MainContent({
  connectionId,
  selectedTable,
  searchQuery,
  onSearchQueryChange,
  viewType,
  onViewTypeChange,
  onRecordClick,
  onTableConfigClick,
}: MainContentProps) {
  // Full table details - only load when a table is selected
  const selectedTableQuery = useQuery({
    queryKey: ['connections', connectionId, 'table-details', selectedTable],
    queryFn: () =>
      selectedTable ? getTable(connectionId, selectedTable) : null,
    enabled: !!selectedTable,
  });

  // Infinite query for records
  const recordsQuery = useInfiniteQuery({
    queryKey: ['connections', connectionId, 'records-infinite', selectedTable],
    queryFn: ({ pageParam = 0 }) =>
      selectedTable
        ? getTableRecordsInfinite(connectionId, selectedTable, { 
            offset: pageParam, 
            limit: 50 
          })
        : null,
    enabled: !!selectedTable,
    getNextPageParam: (lastPage) => lastPage?.nextOffset,
    initialPageParam: 0,
  });

  const currentTable = selectedTableQuery.data;

  // Flatten all records from all pages
  const allRecords = useMemo(() => {
    return recordsQuery.data?.pages.flatMap(page => page?.records || []) || [];
  }, [recordsQuery.data]);

  // Infinite scroll handler
  const handleScroll = useCallback((e: Event) => {
    const target = e.target as Element;
    if (!target) return;
    
    const { scrollTop, scrollHeight, clientHeight } = target;
    const threshold = 200; // Load more when 200px from bottom
    
    if (scrollHeight - scrollTop - clientHeight < threshold && 
        recordsQuery.hasNextPage && 
        !recordsQuery.isFetchingNextPage) {
      recordsQuery.fetchNextPage();
    }
  }, [recordsQuery]);

  // Add scroll listener to the main content container
  useEffect(() => {
    const mainContent = document.querySelector('[data-main-content]');
    if (mainContent) {
      mainContent.addEventListener('scroll', handleScroll);
      return () => mainContent.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  if (!selectedTable) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select a table to view its records
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TableIcon
            className="w-5 h-5 text-emerald-500 cursor-pointer hover:text-emerald-600"
            onClick={onTableConfigClick}
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
              onChange={(e) => onSearchQueryChange(e.target.value)}
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
          {recordsQuery.data?.pages[0]?.total} Records
          {allRecords.length > 0 && ` (${allRecords.length} loaded)`}
        </div>
        <div className="flex items-center gap-1 bg-white rounded-lg border p-1">
          <Button
            variant={viewType === 'grid' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onViewTypeChange('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewType === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onViewTypeChange('list')}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewType === 'table' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onViewTypeChange('table')}
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
      {!recordsQuery.isLoading && allRecords.length === 0 && (
        <div className="flex items-center justify-center py-8 text-gray-500">
          No records found in this table.
        </div>
      )}

      {/* Records Display */}
      {currentTable && allRecords.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto" data-main-content>
          {/* Grid View */}
          {viewType === 'grid' && (
            <div className="h-full min-h-0">
              <GridView
                table={currentTable}
                items={allRecords}
                onRecordClick={onRecordClick}
              />
            </div>
          )}

          {/* List View */}
          {viewType === 'list' && (
            <div className="h-full min-h-0">
              <ListView
                table={currentTable}
                items={allRecords}
                onRecordClick={onRecordClick}
              />
            </div>
          )}

          {/* Table View */}
          {viewType === 'table' && (
            <div className="h-full min-h-0">
              <TableView
                table={currentTable}
                items={allRecords}
                onRecordClick={onRecordClick}
              />
            </div>
          )}

          {/* Loading More Indicator */}
          {recordsQuery.isFetchingNextPage && (
            <div className="flex items-center justify-center py-4 text-gray-500">
              Loading more records...
            </div>
          )}
        </div>
      )}
    </>
  );
}