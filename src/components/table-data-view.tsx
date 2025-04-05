import { TableColumn } from '@/stores/database';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { capitalCase } from 'change-case';
import { useDatabaseStore } from '@/stores/database';
import { RecordSidebar } from './record-sidebar';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getPage } from '@/app/actions';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useMemo, useRef } from 'react';

const PAGE_SIZE = 100;

interface TableDataViewProps {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  totalRows: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  primaryKey?: string[];
  foreignKeys?: {
    columnName: string;
    targetSchema: string;
    targetTable: string;
    targetColumn: string;
    isGuessed?: boolean;
    confidence?: number;
  }[];
}

export function TableDataView({
  columns,
  rows,
  totalRows,
  currentPage,
  pageSize,
  isLoading,
  onPageChange,
  primaryKey,
  foreignKeys,
}: TableDataViewProps) {
  const {
    selectedRecord,
    isSidebarOpen,
    isSidebarPinned,
    selectRecord,
    toggleSidebarPin,
    closeSidebar,
    saveRecord,
  } = useDatabaseStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  const scrollContainerRef = useRef(null);
  const totalPages = Math.ceil(totalRows / pageSize);
  const startRow = (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, totalRows);
  const { activeConnection, activeTable } = useDatabaseStore();
  const tableDataQuery = useInfiniteQuery({
    queryKey: [activeConnection?.id, activeTable?.name],
    queryFn: ({ pageParam = 1 }) =>
      getPage({
        connection: activeConnection!,
        schema: activeTable!.schema,
        table: activeTable!.name,
        page: pageParam,
        pageSize,
      }),
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage.success) return undefined;
      const nextPage = pages.length + 1;
      const maxPage = Math.ceil(totalRows / pageSize);
      return nextPage <= maxPage ? nextPage : undefined;
    },
    initialPageParam: 1,
  });
  const data = useMemo(
    () => tableDataQuery.data?.pages.flatMap((page) => page.rows) || [],
    [tableDataQuery.data]
  );
  const count = totalRows;
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 53,
    overscan: 5,
  });
  const items = virtualizer.getVirtualItems();
  const table = useReactTable({
    data: data,
    columns: columns.map((column) => ({
      id: column.column_name,
      header: () => {
        const isPrimaryKey = primaryKey?.includes(column.column_name);
        const foreignKey = foreignKeys?.find(
          (fk) => fk.columnName === column.column_name
        );
        return (
          <div className="flex items-center space-x-1 uppercase">
            <span className="truncate">{capitalCase(column.column_name)}</span>
            {isPrimaryKey && (
              <span className="text-yellow-500" title="Primary Key">
                🔑
              </span>
            )}
            {foreignKey && (
              <span
                className={
                  foreignKey.isGuessed ? 'text-orange-500' : 'text-blue-500'
                }
                title="Foreign Key"
              >
                🔗
              </span>
            )}
          </div>
        );
      },
      accessorKey: column.column_name,
    })),
    getCoreRowModel: getCoreRowModel(),
  });

  useEffect(() => {
    const lastItem = items[items.length - 1];
    if (!lastItem) return;

    const currentLoadedRows = data.length;
    const visibleDataIndex = lastItem.index;
    const shouldFetchMore = visibleDataIndex >= currentLoadedRows - 20; // Start loading more when we're 20 rows from the end

    if (
      shouldFetchMore &&
      tableDataQuery.hasNextPage &&
      !tableDataQuery.isFetchingNextPage &&
      currentLoadedRows < totalRows
    ) {
      tableDataQuery.fetchNextPage();
    }
  }, [
    items,
    data.length,
    tableDataQuery.hasNextPage,
    tableDataQuery.isFetchingNextPage,
    totalRows,
  ]);

  const { rows: tableRows } = table.getRowModel();

  const handleRowClick = (row: Record<string, unknown>) => {
    selectRecord(row);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Table Container */}
      <div className="flex-initial text-sm text-gray-600 bg-white py-2 px-6 border-b border-gray-200">
        Showing {data.length || 0} rows
      </div>

      <div ref={scrollContainerRef} className="flex-grow overflow-auto">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          <table className="min-w-full divide-y divide-gray-200 relative">
            {table.getHeaderGroups().map((headerGroup) => (
              <thead className="bg-gray-50 sticky top-0" key={headerGroup.id}>
                <tr>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              </thead>
            ))}
            <tbody className="bg-white divide-y divide-gray-200 relative">
              {virtualizer.getVirtualItems().map((virtualRow, index) => {
                const row = tableRows[virtualRow.index];

                if (!row) return null;

                return (
                  <tr
                    key={row.id}
                    className="cursor-pointer hover:bg-gray-50"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${
                        virtualRow.start - index * virtualRow.size
                      }px)`,
                    }}
                    onClick={() => handleRowClick(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <td key={cell.id} className="truncate">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Sidebar */}
      <RecordSidebar
        isOpen={isSidebarOpen}
        isPinned={isSidebarPinned}
        onClose={closeSidebar}
        onPin={toggleSidebarPin}
        record={selectedRecord}
        columns={columns}
        onSave={saveRecord}
      />
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null) return 'NULL';
  if (value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
