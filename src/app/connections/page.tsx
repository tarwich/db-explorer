'use client';

import { ConnectionModal } from '@/components/connection-modal/connection-modal';
import { ItemCardView } from '@/components/explorer/item-views/item-card-view';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useDisclosure } from '@reactuses/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Eye, MoreVertical, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteConnection, getConnections } from '../api/connections';

export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const newConnection = useDisclosure();
  const [editConnectionId, setEditConnectionId] = useState<string | undefined>(
    undefined
  );
  const [deleteConnectionId, setDeleteConnectionId] = useState<
    string | undefined
  >(undefined);

  const connectionsQuery = useQuery({
    queryKey: ['connections'],
    queryFn: () => getConnections(),
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: deleteConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });

  const handleOpenConnection = (connectionId: string) => {
    router.push(`/connections/${connectionId}`);
  };

  const handleEditConnection = (connectionId: string) => {
    setEditConnectionId(connectionId);
  };

  const handleDeleteConnection = (connectionId: string) => {
    setDeleteConnectionId(connectionId);
  };

  const confirmDeleteConnection = async () => {
    if (deleteConnectionId) {
      await deleteConnectionMutation.mutateAsync(deleteConnectionId);
      setDeleteConnectionId(undefined);
    }
  };

  const cancelDeleteConnection = () => {
    setDeleteConnectionId(undefined);
  };

  function ConnectionMenu({ connectionId }: { connectionId: string }) {
    const handleMenuAction = (action: () => void) => (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      action();
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Menu">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleMenuAction(() => handleOpenConnection(connectionId))}>
            <Eye className="w-4 h-4 mr-2" />
            Open
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleMenuAction(() => handleEditConnection(connectionId))}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleMenuAction(() => handleDeleteConnection(connectionId))}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

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
          {connectionsQuery.data?.map((connection, index) => {
            const connectionId = connection.id || String(index);
            return (
              <div
                key={connectionId}
                className="cursor-pointer"
                onClick={() => handleOpenConnection(connectionId)}
              >
                <ItemCardView
                  rightElement={<ConnectionMenu connectionId={connectionId} />}
                  item={{
                    id: connectionId,
                    icon: 'Database',
                    columns: [
                      { name: 'name', value: connection.name },
                      { name: 'type', value: connection.type },
                    ],
                  }}
                />
              </div>
            );
          })}
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
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConnectionId !== undefined} onOpenChange={(open) => {
        if (!open) {
          cancelDeleteConnection();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Connection</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this connection? This action cannot be undone and will permanently remove the connection from your saved connections.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDeleteConnection}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteConnection}>
              Delete Connection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
