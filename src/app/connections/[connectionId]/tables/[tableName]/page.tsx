'use client';

import { ItemCardView } from '@/components/explorer/item-views/item-card-view';
import { ItemHeaderView } from '@/components/explorer/item-views/item-header-view';
import { ICollection, IExplorerItem } from '@/components/explorer/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { getRows, getTableInfo } from './actions';

const PAGE_SIZE = 100;

export default function TablePage({
  params: { connectionId, tableName },
}: {
  params: { connectionId: string; tableName: string };
}) {
  const tableInfoQuery = useQuery({
    queryKey: ['connection', connectionId, 'tables', tableName],
    queryFn: () => getTableInfo({ connectionId, tableName }),
    select: (data) => {
      return {
        id: tableName,
        name: tableName,
        pluralName: tableName,
        type: 'collection',
        icon: 'Table',
        subName: data?.schema,
      } as ICollection;
    },
  });

  const rowsQuery = useQuery({
    queryKey: ['connection', connectionId, 'tables', tableName, 'rows'],
    retry: false,
    queryFn: () =>
      getRows({ connectionId, tableName, page: 1, pageSize: PAGE_SIZE }),
    select: (data): IExplorerItem[] => {
      return data.map((row) => ({
        id: row.id,
        name: row.name,
        icon: 'Table',
        type: 'collection',
        pluralName: tableName,
      }));
    },
  });

  if (tableInfoQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (!tableInfoQuery.data) {
    return (
      <div className="flex items-center justify-center py-8">
        <p>Table not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white gap-2">
      {/* Header */}
      <div className="flex flex-row border-b border-gray-200 p-2">
        <ItemHeaderView item={tableInfoQuery.data} />
      </div>

      {rowsQuery.error && (
        <div className="flex items-center justify-center py-8 w-auto">
          <Alert variant="destructive" className="w-auto min-w-[50vw]">
            <AlertTitle>Error loading rows</AlertTitle>
            <AlertDescription>
              {rowsQuery.error.message || 'An unknown error occurred'}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {rowsQuery.isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        </div>
      )}

      {/* Items */}
      <div className="flex flex-col overflow-y-auto">
        {rowsQuery.data?.map((row) => (
          <ItemCardView key={row.id} item={row} />
        ))}
      </div>
    </div>
  );
}
