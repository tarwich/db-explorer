'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { FetchNextPageOptions } from '@tanstack/react-query';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef } from 'react';

interface InfiniteTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  fetchNextPage: (options?: FetchNextPageOptions) => Promise<unknown>;
  hasNextPage: boolean;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  onRowClick?: (row: TData) => void;
  className?: string;
}

const ROW_HEIGHT = 40;

export function InfiniteTable<TData>({
  columns,
  data,
  fetchNextPage,
  hasNextPage,
  isLoading,
  isFetchingNextPage,
  onRowClick,
  className,
}: InfiniteTableProps<TData>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const count = data.length;
  const virtualizer = useVirtualizer({
    count: hasNextPage ? count + 1 : count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  useEffect(() => {
    const lastItem = virtualizer.getVirtualItems().at(-1);

    if (!lastItem) {
      return;
    }

    if (lastItem.index >= count - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [
    count,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    virtualizer.getVirtualItems(),
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-md border max-h-full flex flex-col overflow-auto',
        className
      )}
      ref={parentRef}
    >
      <div
        className="h-full relative"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        <Table>
          <TableHeader
            className="sticky top-0 bg-gray-100 z-10"
            style={{
              height: ROW_HEIGHT,
            }}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="font-semibold text-gray-600"
                    style={{
                      width: header.getSize(),
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {virtualizer.getVirtualItems().map((virtualRow, index) => {
              const row = table.getRowModel().rows[virtualRow.index];
              if (!row) {
                return hasNextPage ? (
                  // Loading...
                  <TableRow
                    key="loader"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <TableCell
                      className="text-center p-2"
                      colSpan={columns.length}
                    >
                      {isFetchingNextPage ? (
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700" />
                        </div>
                      ) : (
                        'Loading more...'
                      )}
                    </TableCell>
                  </TableRow>
                ) : null;
              }

              return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="whitespace-nowrap"
                  style={{
                    transform: `translateY(${
                      virtualRow.start - index * ROW_HEIGHT
                    }px)`,
                  }}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="max-w-xs text-ellipsis overflow-hidden"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
