'use client';

import { useQuery } from '@tanstack/react-query';
import { getBacklinks } from './recored-editor-sidebar.actions';
import { ItemIcon, TIconName } from './explorer/item-views/item-icon';
import { useState } from 'react';

interface Backlink {
  table: string;
  column: string;
  count: number;
  records: any[];
  tableInfo: any;
  isGuessed: boolean;
}

interface BacklinksProps {
  connectionId: string;
  tableName: string;
  recordId: any;
  onNavigateToRecord?: (targetConnectionId: string, targetTableName: string, targetRecordId: any, displayValue?: string) => void;
}

export function Backlinks({ connectionId, tableName, recordId, onNavigateToRecord }: BacklinksProps) {
  const backlinksQuery = useQuery({
    queryKey: ['backlinks', connectionId, tableName, recordId],
    queryFn: () => getBacklinks({ connectionId, tableName, recordId }),
    enabled: !!connectionId && !!tableName && !!recordId,
  });

  if (backlinksQuery.isLoading) {
    return (
      <div className="mt-8 border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Backlinks</h3>
        <div className="text-sm text-gray-500">Loading references...</div>
      </div>
    );
  }

  if (backlinksQuery.error) {
    return (
      <div className="mt-8 border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Backlinks</h3>
        <div className="text-sm text-red-500">Error loading backlinks</div>
      </div>
    );
  }

  const backlinks = backlinksQuery.data || [];

  if (backlinks.length === 0) {
    return (
      <div className="mt-8 border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Backlinks</h3>
        <div className="text-sm text-gray-500">No references found</div>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <h3 className="text-sm font-medium text-gray-900 mb-4">
        Backlinks ({backlinks.reduce((total: number, link: Backlink) => total + link.count, 0)})
      </h3>
      
      <div className="space-y-3">
        {backlinks.map((backlink: Backlink) => (
          <BacklinkGroup 
            key={`${backlink.table}-${backlink.column}`} 
            backlink={backlink} 
            connectionId={connectionId}
            onNavigateToRecord={onNavigateToRecord}
          />
        ))}
      </div>
    </div>
  );
}

function BacklinkGroup({ 
  backlink, 
  connectionId, 
  onNavigateToRecord 
}: { 
  backlink: Backlink; 
  connectionId: string; 
  onNavigateToRecord?: (targetConnectionId: string, targetTableName: string, targetRecordId: any, displayValue?: string) => void; 
}) {
  const [showAll, setShowAll] = useState(false);

  const getDisplayValue = (record: any) => {
    // Get display field from table metadata if available
    const displayField = backlink.tableInfo?.details?.displayField;
    if (displayField && record[displayField]) {
      return record[displayField];
    }
    
    // Use inline view configuration if available
    const inlineViewColumns = backlink.tableInfo?.details?.inlineView?.columns;
    if (inlineViewColumns) {
      // Get visible columns in order
      const visibleColumns = Object.entries(inlineViewColumns)
        .filter(([_, config]: [string, any]) => !config.hidden)
        .sort(([_, a]: [string, any], [__, b]: [string, any]) => a.order - b.order)
        .map(([columnName]) => columnName);
      
      if (visibleColumns.length > 0) {
        const displayValues = visibleColumns
          .map((colName: string) => record[colName])
          .filter(Boolean);
        
        if (displayValues.length > 0) {
          return displayValues.join(' ');
        }
      }
    }
    
    // Fall back to determine display columns logic
    if (backlink.tableInfo) {
      const { determineDisplayColumns } = require('@/utils/display-columns');
      const displayColumns = determineDisplayColumns(backlink.tableInfo);
      
      const displayValues = displayColumns
        .map((colName: string) => record[colName])
        .filter(Boolean);
      
      if (displayValues.length > 0) {
        return displayValues.join(' ');
      }
    }
    
    // Final fallback to ID or first non-null value
    return record.id || Object.values(record).find(val => val !== null && val !== undefined) || 'Unknown';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <ItemIcon 
          item={{ icon: (backlink.tableInfo?.details?.icon as TIconName) || 'Table' }}
          className="w-4 h-4" 
        />
        <span className="font-medium">{backlink.tableInfo?.details?.pluralName || backlink.table}</span>
        <span className="text-gray-400">({backlink.count})</span>
        {backlink.isGuessed && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
            guessed
          </span>
        )}
      </div>
      
      <div className="ml-6 space-y-1">
        {(showAll ? backlink.records : backlink.records.slice(0, 5)).map((record: any, index: number) => (
          <button
            key={record.id || index}
            onClick={() => onNavigateToRecord?.(connectionId, backlink.table, record.id, getDisplayValue(record))}
            className="block text-left text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 cursor-pointer p-1 rounded transition-colors"
            disabled={!onNavigateToRecord}
          >
            <span className="truncate">{getDisplayValue(record)}</span>
          </button>
        ))}
        
        {backlink.count > 5 && !showAll && (
          <button 
            onClick={() => setShowAll(true)}
            className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            +{backlink.count - 5} more
          </button>
        )}
        
        {showAll && backlink.count > 5 && (
          <button 
            onClick={() => setShowAll(false)}
            className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
}