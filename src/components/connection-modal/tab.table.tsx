'use client';

import { getTable } from '@/app/api/tables';
import { useQuery } from '@tanstack/react-query';
import { EyeIcon, EyeOffIcon, icons } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ItemBadgeView } from '../explorer/item-views/item-badge-view';
import { TColorName } from '../explorer/item-views/item-colors';
import { ItemIcon } from '../explorer/item-views/item-icon';
import { Button } from '../ui/button';
import { ColorPicker } from '../ui/color-picker';
import { IconPicker } from '../ui/icon-picker';
import { Input } from '../ui/input';

interface TableFormValues {
  icon: keyof typeof icons;
  color: TColorName;
  singularName: string;
  pluralName: string;
}

export function TableTab({
  connectionId,
  tableName,
}: {
  connectionId: string;
  tableName: string;
}) {
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
    }
  }, [tableQuery.data]);

  return (
    <form className="flex flex-col gap-3">
      <div className="flex flex-row gap-2 text-sm font-semibold">
        <span>Tables</span>
        <span>/</span>
        <ItemBadgeView
          item={{
            name: tableQuery.data?.details.singularName || tableName,
            icon: form.watch('icon'),
            color: form.watch('color'),
            type: 'collection',
          }}
        />
      </div>

      <div className="flex flex-col gap-4">
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
            <div key={column.name} className="flex flex-row gap-2 items-center">
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
      </div>
    </form>
  );
}
