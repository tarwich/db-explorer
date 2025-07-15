'use client';

import { ConnectionModal } from '@/components/connection-modal/connection-modal';
import { ItemIcon } from '@/components/explorer/item-views/item-icon';
import { Button } from '@/components/ui/button';
import { DatabaseTable } from '@/types/connections';
import { useDisclosure } from '@reactuses/core';
import { MoreVertical } from 'lucide-react';
import { sort } from 'radash';
import { useMemo } from 'react';

interface TableViewProps {
  table: DatabaseTable;
  items: any[];
  onRecordClick: (recordId: any) => void;
}

export function TableView({ table, items, onRecordClick }: TableViewProps) {
  const connectionModal = useDisclosure();
  
  const columns = useMemo(() => {
    const { mergeColumnsForDisplay } = require('@/utils/calculated-columns');

    // Get regular columns
    const regularColumns = sort(
      Object.entries(table.details.columns),
      ([, c]: any) => c.order
    )
      .filter(([, c]: any) => !c.hidden)
      .map(([name]) => table.details.columns[name])
      .filter(Boolean);

    // Merge with calculated columns
    const allColumns = mergeColumnsForDisplay(
      regularColumns,
      table.details.calculatedColumns || []
    );

    return allColumns.filter((col: any) => !col.hidden);
  }, [table]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            {columns.map((column: any) => (
              <th
                key={column.name}
                className="px-4 py-2 text-left text-sm font-medium text-gray-900"
              >
                {column.displayName}
              </th>
            ))}
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y">
          {items.map((record: any, index: number) => {
            // Generate unique key for record using primary key columns
            const pk = table.details.pk;
            let recordKey;
            if (pk && pk.length > 0) {
              const keyValues = pk.map(col => record[col]).filter(val => val !== null && val !== undefined);
              if (keyValues.length === pk.length) {
                recordKey = keyValues.join('|');
              }
            }
            if (!recordKey) {
              recordKey = record.id ?? record.rowid ?? `row-${index}`;
            }
            
            // Generate record ID for modal opening
            let recordId;
            if (pk && pk.length > 0) {
              const keyValues = pk.map(col => record[col]).filter(val => val !== null && val !== undefined);
              if (keyValues.length === pk.length && keyValues.length === 1) {
                recordId = keyValues[0]; // Single primary key
              } else if (keyValues.length === pk.length) {
                recordId = keyValues.join('|'); // Composite primary key
              }
            }
            if (!recordId) {
              recordId = record.id ?? record.rowid ?? null;
            }
            
            return (
              <tr
                key={recordKey}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onRecordClick(recordId)}
              >
              {columns.map((column: any) => {
                const val = record[column.name];
                if (
                  val &&
                  typeof val === 'object' &&
                  'value' in val &&
                  'icon' in val
                ) {
                  return (
                    <td
                      key={column.name}
                      className="px-4 py-2 text-sm flex items-center gap-1"
                    >
                      <ItemIcon item={{ icon: val.icon }} />
                      {val.value}
                    </td>
                  );
                }
                return (
                  <td key={column.name} className="px-4 py-2 text-sm">
                    {String(val)}
                  </td>
                );
              })}
                <td className="px-2 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRecordClick(recordId);
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {connectionModal.isOpen && (
        <ConnectionModal
          isOpen={connectionModal.isOpen}
          onOpenChange={connectionModal.onOpenChange}
          connectionId={table.connectionId}
          initialTableName={table.name}
        />
      )}
    </div>
  );
}