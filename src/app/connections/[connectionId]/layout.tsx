'use client';

import { getConnection } from '@/app/actions/connections';
import { analyzeTables, getTables } from '@/app/actions/tables';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useDisclosure } from '@reactuses/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';

export default function DatabaseView({
  children,
}: {
  children: React.ReactNode;
}) {
  const { connectionId, tableName } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const connectionQuery = useQuery({
    queryKey: ['connection', connectionId],
    queryFn: () => getConnection(connectionId as string),
  });

  const tablesQuery = useQuery({
    queryKey: ['connection', connectionId, 'tables'],
    queryFn: () => getTables(connectionQuery.data!.id!),
    enabled: !!connectionQuery.data,
  });

  const analyzeTablesMutation = useMutation({
    mutationFn: async () => {
      console.log('analyzing tables');
      const result = await analyzeTables(connectionQuery.data!.id!);
      console.log('result', result);
      return result;
    },
    onSuccess: () => {
      console.log('invalidating tables');
      queryClient.invalidateQueries({
        queryKey: ['connection', connectionId, 'tables'],
      });
    },
  });

  const {
    isOpen: isPropertiesDialogOpen,
    onOpen: openPropertiesDialog,
    onClose: closePropertiesDialog,
  } = useDisclosure();

  // Group tables by schema
  const tablesBySchema = useMemo(() => {
    return (
      tablesQuery.data?.reduce((acc, table) => {
        if (!acc[table.schema]) {
          acc[table.schema] = [];
        }
        acc[table.schema].push(table);
        return acc;
      }, {} as Record<string, typeof tablesQuery.data>) ?? {}
    );
  }, [tablesQuery.data]);

  if (connectionQuery.isLoading) {
    return <div>Loading...</div>;
  }

  if (connectionQuery.isError || !connectionQuery.data) {
    return <div>Error loading connection</div>;
  }

  return (
    <div className="flex flex-row h-screen">
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
              onClick={() => analyzeTablesMutation.mutate()}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md"
              title="Refresh tables"
              disabled={analyzeTablesMutation.isPending}
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${
                  analyzeTablesMutation.isPending ? 'animate-spin' : ''
                }`}
              />
            </button>
          </div>
          {analyzeTablesMutation.isPending ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
          ) : (
            // Tables list
            <div className="flex flex-col gap-2">
              {Object.entries(tablesBySchema).map(([schema, tables]) => (
                <div key={schema}>
                  <h4 className="text-sm font-medium text-gray-700 bg-gray-100 p-2">
                    {schema}
                  </h4>
                  <div className="flex flex-col gap-2">
                    {tables.map((table) => (
                      <Link
                        key={table.name}
                        href={`/connections/${connectionId}/tables/${table.name}`}
                        className={cn(
                          'text-sm text-gray-700 p-2 hover:bg-gray-100 rounded-md cursor-pointer',
                          tableName === table.name &&
                            'bg-blue-100 hover:bg-blue-200'
                        )}
                      >
                        {table.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
