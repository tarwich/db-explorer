import { toast } from '@/hooks/use-toast';
import browserLogger from '@/lib/browser-logger';
import { DatabaseConnection } from '@/types/connections';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { forwardRef, useEffect } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { autoAssignAllTables } from './auto-assign-optimized.actions';
import { loadConnection, saveConnection } from './connection-modal.actions';
import { deleteConnection } from './delete-connection.action';

type ConnectionType = 'postgres' | 'sqlite';

type FormValues = {
  type: ConnectionType;
  name: string;
  details: {
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    path?: string;
  };
};

export const ConnectionTab = forwardRef<
  HTMLFormElement,
  {
    connectionId?: string;
    onDelete?: () => void;
    onConnectionIdChange?: (connectionId: string) => void;
  }
>(({ connectionId, onDelete, onConnectionIdChange }, ref) => {
  const queryClient = useQueryClient();
  const connectionQuery = useQuery({
    queryKey: ['connection', connectionId],
    queryFn: () => loadConnection(connectionId ?? ''),
    enabled: !!connectionId,
  });

  const saveConnectionMutation = useMutation({
    mutationFn: (connection: DatabaseConnection) =>
      saveConnection(connectionId ?? '', connection),
    onError: (error) => {
      browserLogger.error('Failed to save connection', {
        connectionId,
        error: error.message || error,
      });
      // Custom local error handling
      toast({
        title: 'Error saving connection',
        description: error.message || 'Failed to save connection settings',
        variant: 'destructive',
      });

      // You could also trigger the global error handler manually if needed:
      browserLogger.error('Connection save failed:', { error });
    },
    onSuccess: (savedConnectionId) => {
      toast({
        title: 'Success',
        description: 'Connection settings saved successfully',
      });
      // Invalidate connections query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      // Update the connection ID if this was a new connection
      if (!connectionId && savedConnectionId && onConnectionIdChange) {
        onConnectionIdChange(savedConnectionId);
      }
    },
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: () => deleteConnection(connectionId ?? ''),
    onError: (error) => {
      browserLogger.error('Failed to delete connection', {
        connectionId,
        error: error.message || error,
      });
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete connection',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Connection deleted successfully',
      });
      // Invalidate connections query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      onDelete?.();
    },
  });

  const autoAssignAllMutation = useMutation({
    mutationFn: () => autoAssignAllTables({ connectionId: connectionId ?? '' }),
    onError: (error) => {
      browserLogger.error('Failed to auto-assign all tables', {
        connectionId,
        error: error.message || error,
      });
      toast({
        title: 'Auto-assignment failed',
        description: error.message || 'Failed to auto-assign all tables',
        variant: 'destructive',
      });
    },
    onSuccess: (result) => {
      toast({
        title: 'Auto-assignment completed',
        description: result.message,
        variant: 'default',
      });
      // Invalidate tables queries to refresh the data
      queryClient.invalidateQueries({
        queryKey: ['connections', connectionId, 'tables'],
      });
      queryClient.invalidateQueries({
        queryKey: ['tables-list', connectionId],
      });
    },
  });

  const form = useForm<FormValues>({
    defaultValues: {
      type: connectionQuery.data?.type ?? 'postgres',
      name: connectionQuery.data?.name ?? '',
      details:
        connectionQuery.data?.type === 'sqlite'
          ? { path: (connectionQuery.data as any)?.details?.path ?? '' }
          : {
              host: 'localhost',
              port: 5432,
              database: '',
              username: '',
              password: '',
            },
    },
  });

  // Update form when connection data is loaded
  useEffect(() => {
    if (!connectionId) {
      form.reset({
        type: 'postgres',
        name: '',
        details: {
          host: 'localhost',
          port: 5432,
          database: '',
          username: '',
          password: '',
        },
      });
    } else if (connectionQuery.data && !form.formState.isDirty) {
      // Ensure sqlite connections always have a path field
      if (connectionQuery.data.type === 'sqlite') {
        form.reset({
          ...connectionQuery.data,
          details: {
            path: (connectionQuery.data.details as any)?.path ?? '',
          },
        });
      } else {
        form.reset(connectionQuery.data);
      }
    }
  }, [connectionQuery.data, form, connectionId]);

  const onSubmit = form.handleSubmit((data) => {
    if (data.type === 'sqlite') {
      saveConnectionMutation.mutate({
        ...data,
        details: {
          path: data.details.path ?? '',
        },
      });
    } else {
      saveConnectionMutation.mutate({
        ...data,
        details: {
          host: data.details.host ?? '',
          port: data.details.port ?? 5432,
          database: data.details.database ?? '',
          username: data.details.username ?? '',
          password: data.details.password ?? '',
        },
      });
    }
  });

  const connectionType = form.watch('type');

  return (
    <FormProvider {...form}>
      <form
        onSubmit={onSubmit}
        className="flex-1 flex flex-col gap-2"
        ref={ref}
      >
        <div className="flex flex-row">
          <div className="text-sm font-semibold">Connection Settings</div>
        </div>

        <div className="flex-1 p-2 overflow-y-auto flex flex-col gap-4">
          <div className="flex flex-row gap-4">
            <div className="space-y-1 flex-1">
              <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Connection Name
              </label>
              <Input
                {...form.register('name')}
                placeholder="My Database Connection"
              />
            </div>

            <div className="space-y-1 flex-1">
              <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Connection Type
              </label>
              <Select
                value={form.watch('type')}
                onValueChange={(value) => {
                  form.setValue('type', value as ConnectionType);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select connection type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgres">PostgreSQL</SelectItem>
                  <SelectItem value="sqlite">SQLite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <hr className="border-neutral-200" />

          {connectionType === 'postgres' && <PostgresConnectionSettings />}
          {connectionType === 'sqlite' && <SqliteConnectionSettings />}
        </div>

        <div className="flex flex-row gap-4 justify-between">
          {/* Auto-assign all tables - only show for existing connections */}
          {connectionId && (
            <Button
              type="button"
              variant="outline"
              onClick={() => autoAssignAllMutation.mutate()}
              disabled={autoAssignAllMutation.status === 'pending'}
              className="flex items-center gap-2"
            >
              {autoAssignAllMutation.status === 'pending' ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Auto-assigning...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Auto-assign All Tables
                </>
              )}
            </Button>
          )}

          <div className="flex flex-row gap-4">
            <Button type="submit">Save</Button>
            {connectionId && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => deleteConnectionMutation.mutate()}
                disabled={deleteConnectionMutation.status === 'pending'}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </form>
    </FormProvider>
  );
});

function PostgresConnectionSettings() {
  const form = useFormContext<FormValues>();

  if (!form) {
    console.error('Form context not found');
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium">Connection Settings</div>

      <div className="flex flex-row gap-4">
        {/* Host */}
        <div className="space-y-1 flex-1">
          <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Host
          </label>
          <Input {...form.register('details.host')} />
        </div>

        {/* Port */}
        <div className="space-y-1 flex-1">
          <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Port
          </label>
          <Input {...form.register('details.port')} />
        </div>
      </div>

      <div className="flex flex-row gap-4">
        {/* Username */}
        <div className="space-y-1 flex-1">
          <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Username
          </label>
          <Input {...form.register('details.username')} />
        </div>

        {/* Password */}
        <div className="space-y-1 flex-1">
          <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Password
          </label>
          <Input {...form.register('details.password')} type="password" />
        </div>
      </div>

      {/* Database */}
      <div className="space-y-1">
        <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Database
        </label>
        <Input {...form.register('details.database')} />
      </div>
    </div>
  );
}

function SqliteConnectionSettings() {
  const form = useFormContext<FormValues>();

  if (!form) {
    console.error('Form context not found');
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium">Connection Settings</div>

      {/* Path */}
      <div className="space-y-1 flex-1">
        <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Path
        </label>
        <Input {...form.register('details.path')} />
      </div>
    </div>
  );
}
