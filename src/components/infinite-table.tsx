'use client';

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
}

const ROW_HEIGHT = 40;

export function InfiniteTable<TData>({
  columns,
  data,
  fetchNextPage,
  hasNextPage,
  isLoading,
  isFetchingNextPage,
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
      className="rounded-md border max-h-full flex flex-col overflow-auto"
      ref={parentRef}
    >
      <div
        className="h-full relative"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        <table className="w-full">
          <thead
            className="sticky top-0 bg-gray-200 z-10"
            style={{
              height: ROW_HEIGHT,
            }}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="whitespace-nowrap overflow-hidden text-ellipsis font-medium text-sm px-4 py-2"
                    style={{
                      height: ROW_HEIGHT,
                      width: header.getSize(),
                    }}
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
            ))}
          </thead>
          <tbody>
            {virtualizer.getVirtualItems().map((virtualRow, index) => {
              const row = table.getRowModel().rows[virtualRow.index];
              if (!row) {
                return hasNextPage ? (
                  <tr
                    key="loader"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <td
                      colSpan={columns.length}
                      className="text-center p-2 border-b border-gray-200"
                    >
                      {isFetchingNextPage ? (
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700" />
                        </div>
                      ) : (
                        'Loading more...'
                      )}
                    </td>
                  </tr>
                ) : null;
              }

              return (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  style={{
                    transform: `translateY(${
                      virtualRow.start - index * ROW_HEIGHT
                    }px)`,
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="whitespace-nowrap overflow-hidden text-ellipsis px-4 py-2"
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
