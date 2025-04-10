'use client';

import { ConnectionCard } from '@/components/connection-card';
import { ConnectionDialog } from '@/components/connection-dialog';
import { useToast } from '@/hooks/use-toast';
import { DatabaseConnection } from '@/types/connections';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useDisclosure } from '@reactuses/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { boot } from './actions/boot';
import { deleteConnection, getConnections } from './actions/connections';

export default function Home() {
  const createConnectionDisclosure = useDisclosure();
  const [editConnectionId, setEditConnectionId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();

  useQuery({
    queryKey: ['boot'],
    queryFn: () => boot(),
    staleTime: Infinity,
  });

  const connectionsQuery = useQuery({
    queryKey: ['connections'],
    queryFn: () => getConnections(),
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: (connection: DatabaseConnection) =>
      deleteConnection(connection.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      handleDialogClose();
      toast({
        title: 'Success',
        description: 'Connection deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to delete connection',
      });
    },
  });

  const editConnection = (connection: DatabaseConnection) => {
    setEditConnectionId(connection.id);
    createConnectionDisclosure.onOpen();
  };

  const handleDialogClose = () => {
    setEditConnectionId(null);
    createConnectionDisclosure.onClose();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h1 className="text-2xl font-semibold text-gray-900">
                Database Connections
              </h1>
              <p className="mt-2 text-sm text-gray-700">
                A list of all your database connections. Click on a connection
                to open it.
              </p>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
              <button
                type="button"
                onClick={createConnectionDisclosure.onOpen}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Add Connection
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {connectionsQuery.data?.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                onEdit={() => editConnection(connection)}
                onSelect={() => router.push(`/connections/${connection.id}`)}
              />
            ))}
            {connectionsQuery.data?.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-sm text-gray-500">
                  No connections yet. Add one to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <ConnectionDialog
        isOpen={createConnectionDisclosure.isOpen}
        onClose={handleDialogClose}
        initialData={
          editConnectionId
            ? connectionsQuery.data?.find(
                (conn) => conn.id === editConnectionId
              )
            : undefined
        }
      />
    </div>
  );
}
