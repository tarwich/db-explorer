import { DatabaseConnection } from '@/types/connections';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect } from 'react';

interface ConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    connection: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
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
      const result = await window.electronAPI.connections.test({
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

    onSave({
      ...formData,
      port: formData.port ? parseInt(formData.port, 10) : DEFAULT_POSTGRES_PORT,
    });
    onClose();
    // Reset form
    setFormData({
      name: '',
      type: 'postgres',
      host: 'localhost',
      port: DEFAULT_POSTGRES_PORT.toString(),
      database: '',
      username: '',
      password: '',
    });
    setConnectionString('');
    setError(null);
    setTestResult(null);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  {initialData ? 'Edit Connection' : 'Add New Connection'}
                </Dialog.Title>

                <div className="mt-4 flex space-x-4">
                  <button
                    type="button"
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                      isManualMode
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsManualMode(true)}
                  >
                    Manual Input
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                      !isManualMode
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsManualMode(false)}
                  >
                    Connection String
                  </button>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Name
                      <input
                        type="text"
                        required
                        placeholder="My PostgreSQL Database"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </label>
                  </div>

                  {!isManualMode && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Connection String
                        <input
                          type="text"
                          placeholder="postgresql://user:password@localhost:5432/database"
                          className="mt-1 block w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={connectionString}
                          onChange={(e) =>
                            handleConnectionStringChange(e.target.value)
                          }
                        />
                      </label>
                      <p className="mt-1 text-xs text-gray-500">
                        Format:
                        postgresql://[user[:password]@][host][:port]/[database]
                      </p>
                    </div>
                  )}

                  <div className={!isManualMode ? 'opacity-50' : ''}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Type
                        <input
                          type="text"
                          readOnly
                          className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
                          value="PostgreSQL"
                        />
                      </label>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Host
                        <input
                          type="text"
                          required
                          placeholder="localhost"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={formData.host}
                          onChange={(e) =>
                            setFormData({ ...formData, host: e.target.value })
                          }
                          readOnly={!isManualMode}
                        />
                      </label>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Port
                        <input
                          type="number"
                          required
                          placeholder={DEFAULT_POSTGRES_PORT.toString()}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={formData.port}
                          onChange={(e) =>
                            setFormData({ ...formData, port: e.target.value })
                          }
                          readOnly={!isManualMode}
                        />
                      </label>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Database
                        <input
                          type="text"
                          required
                          placeholder="postgres"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={formData.database}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              database: e.target.value,
                            })
                          }
                          readOnly={!isManualMode}
                        />
                      </label>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Username
                        <input
                          type="text"
                          required
                          placeholder="postgres"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={formData.username}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              username: e.target.value,
                            })
                          }
                          readOnly={!isManualMode}
                        />
                      </label>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Password
                        <input
                          type="password"
                          required
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              password: e.target.value,
                            })
                          }
                          readOnly={!isManualMode}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      {isTesting ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      {initialData ? 'Save Changes' : 'Add Connection'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
