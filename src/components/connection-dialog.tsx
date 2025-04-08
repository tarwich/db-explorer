'use client';

import { testConnection } from '@/app/actions';
import { deleteConnection, saveConnection } from '@/app/actions/connections';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DatabaseConnection } from '@/types/connections';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

interface ConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: DatabaseConnection;
}

const DEFAULT_POSTGRES_PORT = 5432;

function parseConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);
    if (!url.protocol.startsWith('postgres')) {
      throw new Error('Invalid PostgreSQL connection string');
    }

    const port = url.port ? parseInt(url.port, 10) : DEFAULT_POSTGRES_PORT;
    const database = url.pathname.slice(1); // Remove leading slash
    const [username, password] =
      url.username && url.password
        ? [decodeURIComponent(url.username), decodeURIComponent(url.password)]
        : ['', ''];

    return {
      host: url.hostname || 'localhost',
      port: port,
      database,
      username,
      password,
    };
  } catch {
    throw new Error('Invalid connection string format');
  }
}

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Connection name is required'),
  type: z.literal('postgres'),
  host: z.string().min(1, 'Host is required'),
  port: z.number({ coerce: true }).min(1, 'Port is required'),
  database: z.string().min(1, 'Database name is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof formSchema>;

export function ConnectionDialog({
  isOpen,
  onClose,
  initialData,
}: ConnectionDialogProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [connectionString, setConnectionString] = useState('');
  const [isManualMode, setIsManualMode] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    // resolver: zodResolver(formSchema),
    defaultValues: {
      id: initialData?.id ?? '',
      name: '',
      type: 'postgres',
      host: 'localhost',
      port: DEFAULT_POSTGRES_PORT,
      database: '',
      username: '',
      password: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        id: initialData.id,
        name: initialData.name,
        type: initialData.type,
        host: initialData.host ?? 'localhost',
        port: initialData.port ?? DEFAULT_POSTGRES_PORT,
        database: initialData.database ?? '',
        username: initialData.username ?? '',
        password: initialData.password ?? '',
      });
    }
  }, [initialData, form]);

  const saveConnectionMutation = useMutation({
    mutationFn: (connection: FormValues) => {
      return saveConnection(connection);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      onClose();
      toast({
        title: initialData ? 'Connection Updated' : 'Connection Added',
        description: initialData
          ? 'Your connection has been updated successfully.'
          : 'Your new connection has been added successfully.',
      });
    },
    onError: (error) => {
      console.error('Failed to save connection:', error);
      toast({
        title: 'Error',
        description: 'Failed to save connection. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: (connectionId: string) => deleteConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete connection',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: (connection: FormValues) =>
      testConnection(connection).then((data) => {
        if (!data.success) throw new Error(JSON.stringify(data.error));
        return data;
      }),
    onSuccess: (data) => {
      toast({
        title: 'Connection Tested',
        description: 'Connection test was successful!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Connection Test Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleConnectionStringChange = (value: string) => {
    setConnectionString(value);
    if (!value) return;

    try {
      const parsed = parseConnectionString(value);
      form.reset(parsed);
      setTestResult(null);
    } catch (err) {
      toast({
        title: 'Invalid Connection String',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = form.handleSubmit((data) => {
    saveConnectionMutation.mutate(data);
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Connection' : 'Add New Connection'}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex space-x-4">
          <Button
            variant={isManualMode ? 'secondary' : 'ghost'}
            className="flex-1"
            onClick={() => setIsManualMode(true)}
          >
            Manual Input
          </Button>
          <Button
            variant={!isManualMode ? 'secondary' : 'ghost'}
            className="flex-1"
            onClick={() => setIsManualMode(false)}
          >
            Connection String
          </Button>
        </div>

        {testResult && (
          <div
            className={cn('mt-2 rounded-md p-3', {
              'bg-green-50': testResult.success,
              'bg-red-50': !testResult.success,
            })}
          >
            <p
              className={cn('text-sm', {
                'text-green-600': testResult.success,
                'text-red-600': !testResult.success,
              })}
            >
              {testResult.message}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {!isManualMode && (
            <div className="space-y-2">
              <Label htmlFor="connectionString">Connection String</Label>
              <Input
                id="connectionString"
                type="text"
                placeholder="postgresql://user:password@localhost:5432/database"
                className="font-mono text-sm"
                value={connectionString}
                onChange={(e) => handleConnectionStringChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Format: postgresql://[user[:password]@][host][:port]/[database]
              </p>
            </div>
          )}

          <div className={cn(!isManualMode && 'opacity-50')}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                {...form.register('name')}
                className={cn(form.formState.errors.name && 'border-red-500')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                type="text"
                readOnly
                className="bg-muted"
                value="PostgreSQL"
              />
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="host">Host</Label>
              <Input
                id="host"
                type="text"
                {...form.register('host')}
                className={cn(form.formState.errors.host && 'border-red-500')}
                readOnly={!isManualMode}
              />
              {form.formState.errors.host && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.host.message}
                </p>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                {...form.register('port')}
                className={cn(form.formState.errors.port && 'border-red-500')}
                readOnly={!isManualMode}
              />
              {form.formState.errors.port && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.port.message}
                </p>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="database">Database</Label>
              <Input
                id="database"
                type="text"
                {...form.register('database')}
                className={cn(
                  form.formState.errors.database && 'border-red-500'
                )}
                readOnly={!isManualMode}
              />
              {form.formState.errors.database && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.database.message}
                </p>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                {...form.register('username')}
                className={cn(
                  form.formState.errors.username && 'border-red-500'
                )}
                readOnly={!isManualMode}
              />
              {form.formState.errors.username && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...form.register('password')}
                className={cn(
                  form.formState.errors.password && 'border-red-500'
                )}
                readOnly={!isManualMode}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-between space-x-3">
            {initialData && (
              <Popover open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="destructive">
                    Delete Connection
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">
                        Delete Connection
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete this connection? This
                        action cannot be undone.
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-3"
                        onClick={() => setIsDeleteOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (initialData?.id) {
                            deleteConnectionMutation.mutate(initialData.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                disabled={testConnectionMutation.isPending}
                onClick={() => testConnectionMutation.mutate(form.getValues())}
              >
                {testConnectionMutation.isPending
                  ? 'Testing...'
                  : 'Test Connection'}
              </Button>
              <Button type="submit" disabled={saveConnectionMutation.isPending}>
                {saveConnectionMutation.isPending
                  ? 'Saving...'
                  : initialData
                  ? 'Save Changes'
                  : 'Add Connection'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
