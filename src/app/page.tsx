'use client';

import { AddConnectionDialog } from '@/components/add-connection-dialog';
import { ConnectionCard } from '@/components/connection-card';
import { DatabaseConnection } from '@/types/connections';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    const connections = await window.electronAPI?.connections.getAll();
    setConnections(connections || []);
  };

  const handleAddConnection = async (
    connection: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const newConnection: DatabaseConnection = {
      ...connection,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await window.electronAPI.connections.add(newConnection);
    await loadConnections();
  };

  const handleDeleteConnection = async (id: string) => {
    await window.electronAPI.connections.delete(id);
    await loadConnections();
  };

  const handleSelectConnection = (connection: DatabaseConnection) => {
    // TODO: Implement connection selection
    console.log('Selected connection:', connection);
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
                onClick={() => setIsAddDialogOpen(true)}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Add Connection
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {connections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                onDelete={handleDeleteConnection}
                onSelect={handleSelectConnection}
              />
            ))}
            {connections.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-sm text-gray-500">
                  No connections yet. Add one to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <AddConnectionDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={handleAddConnection}
      />
    </div>
  );
}
