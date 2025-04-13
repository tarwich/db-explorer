'use client';

import { ConnectionModal } from '@/components/connection-modal';
import { ItemCardView } from '@/components/explorer/item-views/item-card-view';
import { ICollection } from '@/components/explorer/types';
import { Header } from '@/components/header';
import { cn } from '@/lib/utils';
import { isPostgresConnection, isSqliteConnection } from '@/types/connections';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import pluralize, { isPlural } from 'pluralize';
import { useState } from 'react';
import { getConnections } from '../actions/connections';

export default function Home() {
  const [editConnectionId, setEditConnectionId] = useState<string | undefined>(
    undefined
  );
  const router = useRouter();

  const DatabaseCollection: ICollection = {
    id: 'databases',
    name: 'Databases',
    type: 'collection',
    pluralName: 'Databases',
    icon: 'Database',
    subName: 'Database Connections',
  };

  const connectionsQuery = useQuery({
    queryKey: ['connections'],
    queryFn: () => getConnections(),
    select: (data) => {
      return data.map((connection): ICollection => {
        const subName = isPostgresConnection(connection)
          ? `${connection.details.username}@${connection.details.host}:${connection.details.port}/${connection.details.database}`
          : isSqliteConnection(connection)
          ? connection.details.path
          : '';
        return {
          id: connection.id || connection.name,
          name: connection.name,
          type: 'collection',
          pluralName: isPlural(connection.name)
            ? connection.name
            : pluralize(connection.name),
          icon: 'Database',
          subName,
        };
      });
    },
  });

  type Connection = Awaited<ReturnType<typeof getConnections>>[number];

  const editConnection = (id: string) => {
    setEditConnectionId(id);
  };

  return (
    <div className="min-h-screen bg-gray-200 p-4 flex flex-col shadow-sm">
      <main className="bg-white rounded-lg p-4 flex-1 flex flex-col gap-4">
        <Header
          icon="Database"
          title="Connections"
          onNew={() => editConnection('new')}
        />

        {/* Connection List */}
        <div
          className={cn(
            'grid gap-4',
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
          )}
        >
          {connectionsQuery.data?.map((connection) => (
            <Link href={`/connections/${connection.id}`} key={connection.id}>
              <ItemCardView
                item={connection}
                onMenuClick={() => editConnection(connection.id)}
              />
            </Link>
          ))}
        </div>
      </main>

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
