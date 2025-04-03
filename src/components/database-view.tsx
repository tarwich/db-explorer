import { useDatabaseStore } from '@/stores/database';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useEffect } from 'react';

export function DatabaseView() {
  const {
    activeConnection,
    tables,
    isLoadingTables,
    loadTables,
    setActiveConnection,
  } = useDatabaseStore();

  useEffect(() => {
    if (activeConnection) {
      loadTables();
    }
  }, [activeConnection, loadTables]);

  if (!activeConnection) return null;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-100 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveConnection(null)}
              className="p-1 hover:bg-gray-200 rounded-md"
              title="Back to connections"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <h2
              className="text-lg font-medium truncate"
              title={activeConnection.name}
            >
              {activeConnection.name}
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500 truncate">
            {activeConnection.database}@{activeConnection.host}
          </p>
        </div>

        {/* Tables List */}
        <div className="flex-1 overflow-y-auto p-2">
          <h3 className="px-3 py-2 text-sm font-medium text-gray-500">
            Tables
          </h3>
          {isLoadingTables ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <ul className="space-y-1">
              {tables.map((table) => (
                <li key={table.id}>
                  <button
                    className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={() => {
                      // TODO: Handle table selection
                    }}
                  >
                    {table.name}
                  </button>
                </li>
              ))}
              {tables.length === 0 && (
                <li className="px-3 py-2 text-sm text-gray-500">
                  No tables found
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white p-6">
        <div className="text-center text-gray-500">
          Select a table to view its records
        </div>
      </div>
    </div>
  );
}
