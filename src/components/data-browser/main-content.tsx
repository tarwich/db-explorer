'use client';

import { getTable, getTableRecords } from '@/app/api/tables';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatabaseTable } from '@/types/connections';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  Table as TableIcon,
} from 'lucide-react';
import { GridView } from './grid-view';
import { ListView } from './list-view';
import { TableView } from './table-view';

type ViewType = 'grid' | 'list' | 'table';

interface MainContentProps {
  connectionId: string;
  selectedTable: string | null;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  page: number;
  pageSize: number;
  viewType: ViewType;
  onViewTypeChange: (viewType: ViewType) => void;
  onRecordClick: (recordId: any) => void;
  onTableConfigClick: () => void;
  onPageChange: (page: number) => void;
}

export function MainContent({
  connectionId,
  selectedTable,
  searchQuery,
  onSearchQueryChange,
  page,
  pageSize,
  viewType,
  onViewTypeChange,
  onRecordClick,
  onTableConfigClick,
  onPageChange,
}: MainContentProps) {
  // Full table details - only load when a table is selected
  const selectedTableQuery = useQuery({
    queryKey: ['connections', connectionId, 'table-details', selectedTable],
    queryFn: () =>
      selectedTable ? getTable(connectionId, selectedTable) : null,
    enabled: !!selectedTable,
  });

  const recordsQuery = useQuery({
    queryKey: ['connections', connectionId, 'records', selectedTable, page],
    queryFn: () =>
      selectedTable
        ? getTableRecords(connectionId, selectedTable, { page, pageSize })
        : null,
    enabled: !!selectedTable,
  });

  const currentTable = selectedTableQuery.data;

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
          {recordsQuery.data?.pagination.total} Records
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
                onRecordClick={onRecordClick}
              />
            </div>
          )}

          {/* List View */}
          {viewType === 'list' && (
            <div className="h-full min-h-0">
              <ListView
                table={currentTable}
                items={recordsQuery.data?.records}
                onRecordClick={onRecordClick}
              />
            </div>
          )}

          {/* Table View */}
          {viewType === 'table' && (
            <div className="h-full min-h-0">
              <TableView
                table={currentTable}
                items={recordsQuery.data?.records}
                onRecordClick={onRecordClick}
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
            onClick={() => onPageChange(Math.max(1, page - 1))}
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
              onPageChange(
                Math.min(
                  recordsQuery.data?.pagination?.totalPages ?? 1,
                  page + 1
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
  );
}