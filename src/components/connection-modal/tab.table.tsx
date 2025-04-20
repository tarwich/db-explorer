'use client';

import { getTable } from '@/app/api/tables';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { EyeIcon, EyeOffIcon, icons, PencilIcon } from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ItemBadgeView } from '../explorer/item-views/item-badge-view';
import { ItemCardView } from '../explorer/item-views/item-card-view';
import { TColorName } from '../explorer/item-views/item-colors';
import { ItemIcon } from '../explorer/item-views/item-icon';
import { ItemInlineView } from '../explorer/item-views/item-inline-view';
import { Button } from '../ui/button';
import { ColorPicker } from '../ui/color-picker';
import { IconPicker } from '../ui/icon-picker';
import { Input } from '../ui/input';
import { Breadcrumbs } from './breadcrumbs';
import { ViewEditor } from './view-editor';

interface TableFormValues {
  icon: keyof typeof icons;
  color: TColorName;
  singularName: string;
  pluralName: string;
}

const createTableTabContext = () => {
  const [page, setPage] = useState<'general' | 'inline-view' | 'card-view'>(
    'general'
  );

  return { page, setPage };
};

type TableTabContextType = ReturnType<typeof createTableTabContext>;

const TableTabContext = createContext<TableTabContextType | null>(null);

const useTableTabContext = () => {
  const context = useContext(TableTabContext);
  if (!context) {
    throw new Error('useTableTabContext must be used within a TableTabContext');
  }
  return context;
};

export function TableTab({
  connectionId,
  tableName,
}: {
  connectionId: string;
  tableName: string;
}) {
  const { page, setPage } = createTableTabContext();

  const tableQuery = useQuery({
    queryKey: ['connections', connectionId, 'tables', tableName],
    queryFn: () => getTable(connectionId, tableName),
  });

  return (
    <TableTabContext.Provider value={{ page, setPage }}>
      <div className="flex flex-col gap-3 h-full overflow-hidden">
        <Breadcrumbs>
          <span>Tables</span>
          <ItemBadgeView
            item={{
              name: tableQuery.data?.details.pluralName || tableName,
              icon: tableQuery.data?.details.icon || 'Table',
              color: tableQuery.data?.details.color || 'green',
              type: 'collection',
            }}
          />
          {page === 'inline-view' && <span>Inline View</span>}
          {page === 'card-view' && <span>Card View</span>}
        </Breadcrumbs>

        {page === 'general' && (
          <TableTabGeneralPage
            connectionId={connectionId}
            tableName={tableName}
          />
        )}
        {page === 'inline-view' && (
          <ViewEditor
            type="inline"
            connectionId={connectionId}
            tableName={tableName}
          />
        )}
        {page === 'card-view' && (
          <ViewEditor
            type="card"
            connectionId={connectionId}
            tableName={tableName}
          />
        )}
      </div>
    </TableTabContext.Provider>
  );
}

export function TableTabGeneralPage({
  connectionId,
  tableName,
}: {
  connectionId: string;
  tableName: string;
}) {
  const { page, setPage } = useTableTabContext();
  const form = useForm<TableFormValues>({
    defaultValues: {
      icon: 'Table',
      color: 'green',
      singularName: '',
      pluralName: '',
    },
  });

  const tableQuery = useQuery({
    queryKey: ['connections', connectionId, 'tables', tableName],
    queryFn: () => getTable(connectionId, tableName),
  });

  useEffect(() => {
    if (tableQuery.data) {
      form.reset({
        icon: tableQuery.data.details.icon,
        color: tableQuery.data.details.color,
        singularName: tableQuery.data.details.singularName,
        pluralName: tableQuery.data.details.pluralName,
      });
      const columns = tableQuery.data.details.columns
        .filter((c) => !c.hidden)
        .map((c) => ({
          name: c.displayName,
          value: c.name,
        }));
    }
  }, [tableQuery.data]);

  const columns = useMemo(() => {
    return (
      tableQuery.data?.details.columns
        .filter((c) => !c.hidden)
        .map((c) => ({
          name: c.displayName,
          value: c.name,
        })) ?? []
    );
  }, [tableQuery.data]);

  return (
    <>
      <form className="flex flex-col gap-3 h-full overflow-hidden">
        <div className={cn('flex flex-col gap-4', 'flex-1 overflow-y-auto')}>
          <div className="text-sm font-medium">Table Information</div>

          {/* Database name */}
          <div className="flex flex-row gap-2 text-xs text-neutral-800">
            <span>Database Name: </span>
            <span>{tableName}</span>
          </div>

          <div className="flex flex-row gap-2">
            {/* Icon */}
            <div className="flex flex-col gap-1 justify-center items-center">
              <div className="text-sm font-medium">Icon</div>
              <IconPicker
                value={form.watch('icon')}
                onChange={(value) => form.setValue('icon', value)}
                className="size-8"
              />
            </div>

            {/* Color */}
            <div className="flex flex-col gap-1 justify-center items-center">
              <div className="text-sm font-medium">Color</div>
              <ColorPicker
                value={form.watch('color')}
                onChange={(value) => form.setValue('color', value)}
                className="size-8"
              />
            </div>

            {/* Singular name */}
            <div className="flex flex-col gap-1 flex-1">
              <div className="text-sm font-medium">Singular Name</div>
              <Input
                {...form.register('singularName')}
                className="w-full"
                placeholder="Table"
              />
            </div>

            {/* Plural name */}
            <div className="flex flex-col gap-1 flex-1">
              <div className="text-sm font-medium">Plural Name</div>
              <Input
                {...form.register('pluralName')}
                className="w-full"
                placeholder="Tables"
              />
            </div>
          </div>

          <div className="text-sm font-medium">Columns</div>

          {/* Columns */}
          <div className="flex flex-col gap-2">
            {tableQuery.data?.details.columns.map((column) => (
              <div
                key={column.name}
                className="flex flex-row gap-2 items-center"
              >
                <Button variant="ghost" size="icon">
                  {column.hidden ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </Button>
                <ItemIcon item={{ icon: column.icon }} />
                <span>{column.displayName}</span>
                <span className="font-mono text-xs text-neutral-700">
                  {column.type}
                </span>
              </div>
            ))}
          </div>

          {/* Inline View */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center justify-between">
              <div className="text-sm font-medium">Inline View</div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPage('inline-view')}
              >
                <PencilIcon className="size-4" />
              </Button>
            </div>

            <div className="flex flex-row gap-2">
              <ItemInlineView
                item={{
                  icon: 'Table',
                  columns: columns,
                }}
              />
            </div>
          </div>

          {/* Card View */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center justify-between">
              <div className="text-sm font-medium">Card View</div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPage('card-view')}
              >
                <PencilIcon className="size-4" />
              </Button>
            </div>

            <div className="flex flex-row gap-2">
              <ItemCardView
                item={{
                  id: '1',
                  icon: 'Table',
                  columns: columns,
                }}
              />
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
