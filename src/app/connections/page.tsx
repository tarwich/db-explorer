'use client';

import { ConnectionModal } from '@/components/connection-modal/connection-modal';
import { ItemCardView } from '@/components/explorer/item-views/item-card-view';
import { Header } from '@/components/header';
import { cn } from '@/lib/utils';
import { useDisclosure } from '@reactuses/core';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { getConnections } from '../api/connections';

export default function Home() {
  const newConnection = useDisclosure();
  const [editConnectionId, setEditConnectionId] = useState<string | undefined>(
    undefined
  );

  const connectionsQuery = useQuery({
    queryKey: ['connections'],
    queryFn: () => getConnections(),
    // select: (data) => {
    //   return data.map((connection) => {
    //     const subName = isPostgresConnection(connection)
    //       ? `${connection.details.username}@${connection.details.host}:${connection.details.port}/${connection.details.database}`
    //       : isSqliteConnection(connection)
    //       ? connection.details.path
    //       : '';
    //     return {
    //       id: connection.id || connection.name,
    //       name: connection.name,
    //       type: 'collection',
    //       pluralName: isPlural(connection.name)
    //         ? connection.name
    //         : pluralize(connection.name),
    //       icon: 'Database' as TIconName,
    //       subName,
    //     };
    //   });
    // },
  });

  return (
    <div className="min-h-screen bg-gray-200 p-4 flex flex-col shadow-sm">
      <main className="bg-white rounded-lg p-4 flex-1 flex flex-col gap-4">
        <Header
          icon="Database"
          title="Connections"
          onNew={newConnection.onOpen}
        />

        {/* Connection List */}
        <div
          className={cn(
            'grid gap-4',
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
          )}
        >
          {connectionsQuery.data?.map((connection, index) => (
            <Link href={`/connections/${connection.id}`} key={connection.id}>
              <ItemCardView
                onMenuClick={() => setEditConnectionId(connection.id)}
                item={{
                  id: connection.id || String(index),
                  icon: 'Database',
                  columns: [
                    { name: 'name', value: connection.name },
                    { name: 'type', value: connection.type },
                  ],
                }}
              />
            </Link>
          ))}
        </div>
      </main>
      {newConnection.isOpen && (
        <ConnectionModal
          isOpen={newConnection.isOpen}
          onOpenChange={newConnection.onOpenChange}
        />
      )}
      {editConnectionId && (
        <ConnectionModal
          isOpen={true}
          onOpenChange={() => setEditConnectionId(undefined)}
          connectionId={editConnectionId}
        />
      )}
    </div>
  );
}
