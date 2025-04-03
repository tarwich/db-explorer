import { useDatabaseStore } from '@/stores/database';
import { ArrowLeftIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useEffect } from 'react';
import { TableDataView } from './table-data-view';

export function DatabaseView() {
  const {
    activeConnection,
    tables,
    isLoadingTables,
    loadTables,
    setActiveConnection,
    activeTable,
    setActiveTable,
    tableData,
    isLoadingTableData,
  } = useDatabaseStore();

  useEffect(() => {
    if (activeConnection) {
      loadTables();
    }
  }, [activeConnection, loadTables]);

  // Group tables by schema
  const tablesBySchema = tables.reduce((acc, table) => {
    if (!acc[table.schema]) {
      acc[table.schema] = [];
    }
    acc[table.schema].push(table);
    return acc;
  }, {} as Record<string, typeof tables>);

  if (!activeConnection) return null;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveConnection(null)}
              className="p-1 hover:bg-gray-200 rounded-md"
              title="Back to connections"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
            </button>
            <h2
              className="text-lg font-medium truncate text-gray-900"
              title={activeConnection.name}
            >
              {activeConnection.name}
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-600 truncate">
            {activeConnection.database}@{activeConnection.host}
          </p>
        </div>

        {/* Tables List */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="px-3 py-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              Database Objects
            </h3>
            <button
              onClick={() => loadTables()}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md"
              title="Refresh tables"
              disabled={isLoadingTables}
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${isLoadingTables ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
          {isLoadingTables ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(tablesBySchema).map(([schema, schemaTables]) => (
                <div key={schema}>
                  <h4 className="px-3 py-1 text-xs font-medium text-gray-600 uppercase">
                    {schema}
                  </h4>
                  <ul className="mt-1 space-y-1">
                    {schemaTables.map((table) => (
                      <li key={table.id}>
                        <button
                          className={`w-full px-3 py-2 text-left text-sm rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 group ${
                            activeTable?.id === table.id
                              ? 'bg-gray-200 text-gray-900'
                              : 'text-gray-700'
                          }`}
                          onClick={() => setActiveTable(table)}
                          title={table.description || undefined}
                        >
                          <div className="flex items-center">
                            <span className="flex-1 truncate">
                              {table.name}
                            </span>
                            <span className="ml-2 text-xs text-gray-500 invisible group-hover:visible">
                              {table.type}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {tables.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-600">
                  No tables found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white p-6 overflow-hidden flex flex-col">
        {activeTable ? (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-medium text-gray-900">
                {activeTable.schema}.{activeTable.name}
              </h2>
              {activeTable.description && (
                <p className="mt-1 text-sm text-gray-600">
                  {activeTable.description}
                </p>
              )}
            </div>
            {tableData ? (
              <TableDataView
                columns={tableData.columns}
                rows={tableData.rows}
                totalRows={tableData.totalRows}
                isLoading={isLoadingTableData}
              />
            ) : (
              <div className="text-center text-gray-600">
                {isLoadingTableData
                  ? 'Loading table data...'
                  : 'No data available'}
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-600">
            Select a table to view its records
          </div>
        )}
      </div>
    </div>
  );
}
