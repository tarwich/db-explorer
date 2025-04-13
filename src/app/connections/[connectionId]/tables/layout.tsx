'use client';

import { ConnectionModal } from '@/components/connection-modal';
import { ItemInlineView } from '@/components/explorer/item-views/item-inline-view';
import { Button } from '@/components/ui/button';
import { useResizable } from '@/hooks/use-resizable';
import { useDisclosure } from '@reactuses/core';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Ellipsis } from 'lucide-react';
import Link from 'next/link';
import { getConnection, getTables } from './actions';

export default function Page({
  params: { connectionId },
  children,
}: {
  params: { connectionId: string };
  children: React.ReactNode;
}) {
  const connectionModal = useDisclosure();
  const { width, resizerProps } = useResizable();
  const connectionQuery = useQuery({
    queryKey: ['connection', connectionId],
    queryFn: () => getConnection({ connectionId }),
  });
  const tablesQuery = useQuery({
    queryKey: ['tables', connectionId],
    queryFn: () => getTables({ connectionId }),
  });

  if (connectionQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="size-full flex-1 bg-gray-200 flex flex-row">
      <div
        className="flex flex-col gap-4 bg-white p-4 border-r"
        style={{ width }}
      >
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-row items-center gap-2 w-full">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Link href={`/`}>
                <ArrowLeft size={24} />
              </Link>
            </button>
            <h1 className="flex-1 text-2xl font-normal text-ellipsis overflow-hidden whitespace-nowrap">
              {connectionQuery.data?.name}
            </h1>
            <button
              className="p-2 hover:bg-gray-100 rounded-lg"
              onClick={connectionModal.onOpen}
            >
              <Ellipsis size={24} />
            </button>
            {connectionModal.isOpen && (
              <ConnectionModal
                isOpen={connectionModal.isOpen}
                onOpenChange={connectionModal.onOpenChange}
                connectionId={connectionId}
              />
            )}
          </div>
          {connectionQuery.data?.subName && (
            <p className="text-sm text-gray-500 text-ellipsis overflow-hidden whitespace-nowrap">
              {connectionQuery.data?.subName}
            </p>
          )}
        </div>

        {/* Loading */}
        {tablesQuery.isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        )}

        {/* Items */}
        <div className="flex flex-col -mx-4 px-2 overflow-y-auto">
          {tablesQuery.data?.map((collection) => (
            <div
              className="flex flex-row hover:bg-gray-100 cursor-pointer rounded-md group items-center"
              key={collection.id}
            >
              <Link
                href={`/connections/${connectionId}/tables/${collection.id}`}
                className="flex-1"
              >
                <ItemInlineView item={collection} />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="group-hover:visible invisible hover:bg-gray-200"
              >
                <Ellipsis size={24} />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="relative h-full w-0">
        <div {...resizerProps}></div>
      </div>

      <div className="flex flex-col bg-white flex-1 m-2 rounded-md p-4">
        {children}
      </div>
    </div>
  );
}
