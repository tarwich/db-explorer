'use client';

import { ConnectionModal } from '@/components/connection-modal/connection-modal';
import { ItemListView } from '@/components/explorer/item-views/item-list-view';
import { DatabaseTable } from '@/types/connections';
import { useDisclosure } from '@reactuses/core';
import { sort } from 'radash';
import { useMemo } from 'react';

interface ListViewProps {
  table: DatabaseTable;
  items: any[];
  onRecordClick: (recordId: any) => void;
}

export function ListView({ table, items, onRecordClick }: ListViewProps) {
  const connectionModal = useDisclosure();
  
  const columns = useMemo(() => {
    // Get regular columns from view configuration
    const regularColumns = Object.values(table.details.columns).map((c) => ({
      id: c.name,
      name: c.name,
      displayName: c.displayName,
      icon: c.icon,
      type: c.type,
      hidden: table.details.listView.columns[c.name]?.hidden ?? c.hidden,
      order: table.details.listView.columns[c.name]?.order ?? 0,
      calculated: false,
    }));

    // Get calculated columns from view configuration
    const calculatedColumns = (table.details.calculatedColumns || []).map(
      (c: any) => ({
        id: `calc_${c.id}`,
        name: c.name,
        displayName: c.displayName,
        icon: c.icon,
        type: 'calculated',
        hidden:
          table.details.listView.columns[`calc_${c.id}`]?.hidden ?? c.hidden,
        order: table.details.listView.columns[`calc_${c.id}`]?.order ?? c.order,
        calculated: true,
      })
    );

    // Combine and sort all columns
    const allColumns = [...regularColumns, ...calculatedColumns];
    return sort(allColumns, (c: any) => c.order).filter((c: any) => !c.hidden);
  }, [table]);

  // Generate unique key for record using primary key columns
  const getRecordKey = (record: any, index: number) => {
    const pk = table.details.pk;
    if (pk && pk.length > 0) {
      const keyValues = pk.map(col => record[col]).filter(val => val !== null && val !== undefined);
      if (keyValues.length === pk.length) {
        return keyValues.join('|');
      }
    }
    // Fallback to record.id or record.rowid, then index
    return record.id ?? record.rowid ?? `row-${index}`;
  };

  // Generate record ID for modal opening
  const getRecordId = (record: any, index: number) => {
    const pk = table.details.pk;
    if (pk && pk.length > 0) {
      const keyValues = pk.map(col => record[col]).filter(val => val !== null && val !== undefined);
      if (keyValues.length === pk.length && keyValues.length === 1) {
        return keyValues[0]; // Single primary key
      } else if (keyValues.length === pk.length) {
        return keyValues.join('|'); // Composite primary key
      }
    }
    // Should not fall back to synthetic IDs - use actual record values
    return record.id ?? record.rowid ?? null;
  };

  return (
    <div className="space-y-2">
      {items.map((record: any, index: number) => {
        const recordKey = getRecordKey(record, index);
        const recordId = getRecordId(record, index);
        return (
          <div
            key={recordKey}
            className="cursor-pointer"
            onClick={() => onRecordClick(recordId)}
          >
            <ItemListView
              item={{
                id: recordId,
                icon: table.details.icon,
                columns: columns.map((c) => {
                  const val = record[c.id];
                  if (
                    val &&
                    typeof val === 'object' &&
                    'value' in val &&
                    'icon' in val
                  ) {
                    return {
                      name: c.displayName,
                      value: val.value,
                      icon: val.icon,
                    };
                  }
                  return {
                    name: c.displayName,
                    value: String(val),
                  };
                }),
              }}
            />
          </div>
        );
      })}
      {connectionModal.isOpen && (
        <ConnectionModal
          isOpen={connectionModal.isOpen}
          onOpenChange={connectionModal.onOpenChange}
          connectionId={table.connectionId}
          initialTableName={table.name}
          initialTablePage="list-view"
        />
      )}
    </div>
  );
}