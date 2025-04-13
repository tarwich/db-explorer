import { toast } from '@/hooks/use-toast';
import { DatabaseConnection } from '@/types/connections';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { loadConnection, saveConnection } from './connection-modal.actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

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

export function ConnectionModal({
  isOpen,
  onOpenChange,
  connectionId,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
}) {
  const [connectionType, setConnectionType] =
    useState<ConnectionType>('postgres');
  const connectionQuery = useQuery({
    queryKey: ['connection', connectionId],
    queryFn: () => loadConnection(connectionId),
    enabled: connectionId !== 'new',
  });
  const saveConnectionMutation = useMutation({
    mutationFn: (connection: DatabaseConnection) =>
      saveConnection(connectionId, connection),
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save connection settings',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Connection settings saved successfully',
      });
      onOpenChange(false);
    },
  });

  const form = useForm<FormValues>({
    defaultValues: {
      type: connectionType,
      name: '',
      details: {
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
    if (connectionId === 'new') {
      form.reset({
        type: connectionType,
        name: '',
        details: {
          host: 'localhost',
          port: 5432,
          database: '',
          username: '',
          password: '',
        },
      });
    } else if (connectionQuery.data) {
      form.reset(connectionQuery.data);
      setConnectionType(connectionQuery.data.type);
    }
  }, [connectionQuery.data, form, connectionId, connectionType]);

  const onSubmit = form.handleSubmit((data) => {
    saveConnectionMutation.mutate(data);
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogOverlay />
      <DialogContent className="w-[90vw] h-[90vh] max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Connection Settings</DialogTitle>
        </DialogHeader>
        {connectionId !== 'new' && connectionQuery.isLoading ? (
          <Alert>
            <AlertTitle>Loading...</AlertTitle>
            <AlertDescription>Loading connection settings...</AlertDescription>
          </Alert>
        ) : connectionId !== 'new' && connectionQuery.error ? (
          <Alert>
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Error loading connection settings.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={onSubmit} className="h-full flex flex-col">
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
                    value={connectionType}
                    onValueChange={(value: ConnectionType) => {
                      setConnectionType(value);
                      form.reset({
                        type: value,
                        name: form.getValues('name'),
                        details: {
                          host: 'localhost',
                          port: 5432,
                          database: '',
                          username: '',
                          password: '',
                        },
                      } as DatabaseConnection);
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

              <div className="space-y-4">
                <h3 className="font-medium">Connection Details</h3>
                {connectionType === 'postgres' ? (
                  <PostgresConnectionSettings form={form} />
                ) : (
                  <SQLiteConnectionSettings form={form} />
                )}
              </div>
            </div>
            <DialogFooter className="p-4 bg-muted/50">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveConnectionMutation.isPending}>
                {saveConnectionMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PostgresConnectionSettings({
  form,
}: {
  form: ReturnType<typeof useForm<FormValues>>;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-row gap-4">
        <div className="space-y-1 flex-1">
          <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Host
          </label>
          <Input {...form.register('details.host')} placeholder="localhost" />
        </div>
        <div className="space-y-1 flex-1">
          <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Port
          </label>
          <Input
            {...form.register('details.port', { valueAsNumber: true })}
            type="number"
            placeholder="5432"
          />
        </div>
      </div>

      <div className="flex flex-row gap-4">
        <div className="space-y-1 flex-1">
          <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Username
          </label>
          <Input
            {...form.register('details.username')}
            placeholder="postgres"
          />
        </div>
        <div className="space-y-1 flex-1">
          <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Password
          </label>
          <Input
            {...form.register('details.password')}
            type="password"
            placeholder="••••••••"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Database
        </label>
        <Input
          {...form.register('details.database')}
          placeholder="my_database"
        />
      </div>
    </div>
  );
}

function SQLiteConnectionSettings({
  form,
}: {
  form: ReturnType<typeof useForm<FormValues>>;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Database File Path
        </label>
        <Input
          {...form.register('details.path')}
          placeholder="/path/to/database.sqlite"
        />
      </div>
    </div>
  );
}
