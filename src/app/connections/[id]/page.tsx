'use client';

import { getConnection } from '@/app/actions/connections';
import { analyzeTables, getTables } from '@/app/actions/tables';
import { TableDataView } from '@/components/table-data-view';
import { TablePropertiesDialog } from '@/components/table-properties-dialog';
import { useDatabaseStore } from '@/stores/database';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { useDisclosure } from '@reactuses/core';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function DatabaseView() {
  const { id } = useParams();
  const router = useRouter();
  const {
    tables,
    isLoadingTables,
    loadTables,
    activeTable,
    setActiveTable,
    tableData,
    isLoadingTableData,
    loadTableData,
    updateTable,
  } = useDatabaseStore();

  const connectionQuery = useQuery({
    queryKey: ['connection', id],
    queryFn: () => getConnection(id as string),
  });

  const tablesQuery = useQuery({
    queryKey: ['connection', id, 'tables'],
    queryFn: () => getTables(),
  });

  const analyzeTablesMutation = useMutation({
    mutationFn: () => analyzeTables(connectionQuery.data!),
  });

  const {
    isOpen: isPropertiesDialogOpen,
    onOpen: openPropertiesDialog,
    onClose: closePropertiesDialog,
  } = useDisclosure();

  useEffect(() => {
    if (connectionQuery.data) {
      loadTables();
    }
  }, [connectionQuery.data, loadTables]);

  // Group tables by schema
  const tablesBySchema = tables.reduce((acc, table) => {
    if (!acc[table.schema]) {
      acc[table.schema] = [];
    }
    acc[table.schema].push(table);
    return acc;
  }, {} as Record<string, typeof tables>);

  const handlePageChange = (page: number) => {
    loadTableData(page, tableData?.pageSize ?? 50);
  };

  if (connectionQuery.isLoading) {
    return <div>Loading...</div>;
  }

  if (connectionQuery.isError || !connectionQuery.data) {
    return <div>Error loading connection</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Sidebar */}
      <div className="h-full w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => router.push('/')}
              className="p-1 hover:bg-gray-200 rounded-md"
              title="Back to connections"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
            </button>
            <h2
              className="text-lg font-medium truncate text-gray-900"
              title={connectionQuery.data.name}
            >
              {connectionQuery.data.name}
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-600 truncate">
            {connectionQuery.data.database}@{connectionQuery.data.host}
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
      <div className="flex-1 bg-white flex flex-col overflow-hidden">
        {activeTable ? (
          <>
            <div className="p-6 pb-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-medium text-gray-900">
                    {activeTable.schema}.{activeTable.name}
                  </h2>
                  {activeTable.description && (
                    <p className="mt-1 text-sm text-gray-600">
                      {activeTable.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => openPropertiesDialog()}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                  title="Edit table properties"
                >
                  <WrenchScrewdriverIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            {tableData ? (
              <div className="flex-1 flex flex-col min-h-0 px-6">
                <TableDataView
                  columns={tableData.columns}
                  rows={tableData.rows}
                  totalRows={tableData.totalRows}
                  currentPage={tableData.currentPage}
                  pageSize={tableData.pageSize}
                  isLoading={isLoadingTableData}
                  onPageChange={handlePageChange}
                  primaryKey={tableData.primaryKey}
                  foreignKeys={tableData.foreignKeys}
                />
              </div>
            ) : (
              <div className="p-6 text-center text-gray-600">
                {isLoadingTableData
                  ? 'Loading table data...'
                  : 'No data available'}
              </div>
            )}

            {/* Table Properties Dialog */}
            {activeTable && (
              <TablePropertiesDialog
                isOpen={isPropertiesDialogOpen}
                onClose={closePropertiesDialog}
                onSave={async (updates) => {
                  await updateTable(activeTable.id, {
                    ...activeTable,
                    ...updates,
                  });
                  // Refresh table data to reflect changes
                  loadTableData(
                    tableData?.currentPage ?? 1,
                    tableData?.pageSize ?? 50
                  );
                }}
                table={activeTable}
              />
            )}
          </>
        ) : (
          <div className="p-6 text-center text-gray-600">
            Select a table to view its records
          </div>
        )}
      </div>
    </div>
  );
}
