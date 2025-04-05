import { DatabaseConnection } from '@/types/connections';
import { Fragment, useState, useEffect, ChangeEvent } from 'react';
import { testConnection } from '@/app/actions';
import { saveConnection } from '@/app/actions/connections';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    connection: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  onDelete?: (connection: DatabaseConnection) => void;
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
      port: port.toString(),
      database,
      username,
      password,
    };
  } catch {
    throw new Error('Invalid connection string format');
  }
}

export function ConnectionDialog({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
}: ConnectionDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'postgres' as DatabaseConnection['type'],
    host: 'localhost',
    port: DEFAULT_POSTGRES_PORT.toString(),
    database: '',
    username: '',
    password: '',
  });
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        type: initialData.type,
        host: initialData.host ?? 'localhost',
        port: (initialData.port ?? DEFAULT_POSTGRES_PORT).toString(),
        database: initialData.database ?? '',
        username: initialData.username ?? '',
        password: initialData.password ?? '',
      });
    } else {
      setFormData({
        name: '',
        type: 'postgres',
        host: 'localhost',
        port: DEFAULT_POSTGRES_PORT.toString(),
        database: '',
        username: '',
        password: '',
      });
    }
  }, [initialData]);

  const [error, setError] = useState<string | null>(null);
  const [connectionString, setConnectionString] = useState('');
  const [isManualMode, setIsManualMode] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);

  const saveConnectionMutation = useMutation({
    mutationFn: saveConnection,
    onSuccess: () => {
      onClose();
    },
    onError: (error) => {
      console.error('Failed to save connection:', error);
    },
  });

  const handleConnectionStringChange = (value: string) => {
    setConnectionString(value);
    if (!value) return;

    try {
      const parsed = parseConnectionString(value);
      setFormData((prev) => ({
        ...prev,
        ...parsed,
      }));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Connection name is required');
      return false;
    }
    if (!formData.host.trim()) {
      setError('Host is required');
      return false;
    }
    if (!formData.database.trim()) {
      setError('Database name is required');
      return false;
    }
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }
    setError(null);
    return true;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) return;

    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await testConnection({
        ...formData,
        port: formData.port
          ? parseInt(formData.port, 10)
          : DEFAULT_POSTGRES_PORT,
      });

      if (result.success) {
        setTestResult({
          success: true,
          message: 'Connection successful!',
        });
      } else {
        setTestResult({
          success: false,
          message: `Connection failed: ${result.error}`,
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: `Connection failed: ${(err as Error).message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    saveConnectionMutation.mutate({
      ...formData,
      port: formData.port ? parseInt(formData.port, 10) : DEFAULT_POSTGRES_PORT,
    });
  };

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

        {error && (
          <div className="mt-2 rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {testResult && (
          <div
            className={`mt-2 rounded-md p-3 ${
              testResult.success ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            <p
              className={`text-sm ${
                testResult.success ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {testResult.message}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              required
              placeholder="My PostgreSQL Database"
              value={formData.name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          {!isManualMode && (
            <div className="space-y-2">
              <Label htmlFor="connectionString">Connection String</Label>
              <Input
                id="connectionString"
                type="text"
                placeholder="postgresql://user:password@localhost:5432/database"
                className="font-mono text-sm"
                value={connectionString}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleConnectionStringChange(e.target.value)
                }
              />
              <p className="text-xs text-muted-foreground">
                Format: postgresql://[user[:password]@][host][:port]/[database]
              </p>
            </div>
          )}

          <div className={!isManualMode ? 'opacity-50' : ''}>
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
                required
                placeholder="localhost"
                value={formData.host}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, host: e.target.value })
                }
                readOnly={!isManualMode}
              />
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                required
                placeholder={DEFAULT_POSTGRES_PORT.toString()}
                value={formData.port}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, port: e.target.value })
                }
                readOnly={!isManualMode}
              />
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="database">Database</Label>
              <Input
                id="database"
                type="text"
                required
                placeholder="postgres"
                value={formData.database}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFormData({
                    ...formData,
                    database: e.target.value,
                  })
                }
                readOnly={!isManualMode}
              />
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                required
                placeholder="postgres"
                value={formData.username}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFormData({
                    ...formData,
                    username: e.target.value,
                  })
                }
                readOnly={!isManualMode}
              />
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFormData({
                    ...formData,
                    password: e.target.value,
                  })
                }
                readOnly={!isManualMode}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-between space-x-3">
            {initialData && onDelete && (
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
                          onDelete(initialData);
                          setIsDeleteOpen(false);
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
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button type="submit">
                {initialData ? 'Save Changes' : 'Add Connection'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
