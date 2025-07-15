'use client';

import { getTable, getTableRecordsInfinite } from '@/app/api/tables';
import { analyzeTableSearchCapabilities, searchTableRecords } from '@/app/api/search';
import { Button } from '@/components/ui/button';
import { DatabaseTable } from '@/types/connections';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  LayoutGrid,
  List,
  Plus,
  Table as TableIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { GridView } from './grid-view';
import { ListView } from './list-view';
import { SearchInput } from './search-input';
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
  const [searchType, setSearchType] = useState<string>('column_specific');

  // Full table details - only load when a table is selected
  const selectedTableQuery = useQuery({
    queryKey: ['connections', connectionId, 'table-details', selectedTable],
    queryFn: () =>
      selectedTable ? getTable(connectionId, selectedTable) : null,
    enabled: !!selectedTable,
  });

  // Search capabilities - load when table is selected
  const searchCapabilitiesQuery = useQuery({
    queryKey: ['connections', connectionId, 'search-capabilities', selectedTable],
    queryFn: () =>
      selectedTable ? analyzeTableSearchCapabilities(connectionId, selectedTable) : null,
    enabled: !!selectedTable,
  });

  // Determine if we should use search or regular infinite scroll
  const isSearching = searchQuery.trim().length > 0;

  // Infinite query for records (when not searching)
  const recordsQuery = useInfiniteQuery({
    queryKey: ['connections', connectionId, 'records-infinite', selectedTable],
    queryFn: ({ pageParam = 0 }) =>
      selectedTable
        ? getTableRecordsInfinite(connectionId, selectedTable, { 
            offset: pageParam, 
            limit: 50 
          })
        : null,
    enabled: !!selectedTable && !isSearching,
    getNextPageParam: (lastPage) => lastPage?.nextOffset,
    initialPageParam: 0,
  });

  // Infinite query for search results (when searching)
  const searchResultsQuery = useInfiniteQuery({
    queryKey: ['connections', connectionId, 'search-infinite', selectedTable, searchQuery, searchType],
    queryFn: ({ pageParam = 0 }) =>
      selectedTable && searchQuery.trim()
        ? searchTableRecords(connectionId, selectedTable, searchQuery.trim(), {
            searchType: searchType as any,
            offset: pageParam,
            limit: 50,
          })
        : null,
    enabled: !!selectedTable && isSearching,
    getNextPageParam: (lastPage) => lastPage?.nextOffset,
    initialPageParam: 0,
  });

  const currentTable = selectedTableQuery.data;

  // Use appropriate query based on search state
  const activeQuery = isSearching ? searchResultsQuery : recordsQuery;

  // Flatten all records from all pages
  const allRecords = useMemo(() => {
    return activeQuery.data?.pages.flatMap(page => page?.records || []) || [];
  }, [activeQuery.data]);

  // Infinite scroll handler
  const handleScroll = useCallback((e: Event) => {
    const target = e.target as Element;
    if (!target) return;
    
    const { scrollTop, scrollHeight, clientHeight } = target;
    const threshold = 200; // Load more when 200px from bottom
    
    if (scrollHeight - scrollTop - clientHeight < threshold && 
        activeQuery.hasNextPage && 
        !activeQuery.isFetchingNextPage) {
      activeQuery.fetchNextPage();
    }
  }, [activeQuery]);

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
          <SearchInput
            value={searchQuery}
            onChange={onSearchQueryChange}
            onSearchTypeChange={setSearchType}
            searchCapabilities={searchCapabilitiesQuery.data || undefined}
            className="w-80"
            placeholder="Search records..."
          />
          <Button className="gap-1">
            <Plus className="w-4 h-4" />
            New Record
          </Button>
        </div>
      </div>

      {/* View Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium">
          {isSearching && searchResultsQuery.data?.pages[0]?.searchInfo && (
            <span className="text-blue-600 mr-2">
              Search: "{searchQuery}" • 
            </span>
          )}
          {activeQuery.data?.pages[0]?.total} Records
          {allRecords.length > 0 && ` (${allRecords.length} loaded)`}
          {isSearching && searchCapabilitiesQuery.data && (
            <span className="text-gray-500 text-xs ml-2">
              ({searchCapabilitiesQuery.data.tableSize} table)
            </span>
          )}
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
      {activeQuery.isLoading && (
        <div className="flex items-center justify-center py-8 text-gray-500">
          {isSearching ? 'Searching...' : 'Loading records...'}
        </div>
      )}

      {/* Error State */}
      {activeQuery.isError && (
        <div className="flex items-center justify-center py-8 text-red-500">
          {isSearching ? 'Search failed. Please try again.' : 'Error loading records. Please try again.'}
        </div>
      )}

      {/* Empty State */}
      {!activeQuery.isLoading && allRecords.length === 0 && (
        <div className="flex items-center justify-center py-8 text-gray-500">
          {isSearching 
            ? `No records found matching "${searchQuery}"` 
            : 'No records found in this table.'
          }
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
          {activeQuery.isFetchingNextPage && (
            <div className="flex items-center justify-center py-4 text-gray-500">
              {isSearching ? 'Loading more search results...' : 'Loading more records...'}
            </div>
          )}
        </div>
      )}
    </>
  );
}