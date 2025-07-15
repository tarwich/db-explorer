'use client';

import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { ItemIcon, TIconName } from './explorer/item-views/item-icon';

export interface BreadcrumbItem {
  connectionId: string;
  tableName: string;
  recordId: any;
  displayValue: string;
  tableInfo?: any;
}

interface RecordNavigationBreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (item: BreadcrumbItem, index: number) => void;
  className?: string;
}

export function RecordNavigationBreadcrumbs({ 
  items, 
  onNavigate, 
  className 
}: RecordNavigationBreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <div className={cn(
      'flex items-center gap-2 text-sm overflow-hidden',
      className
    )}>
      {items.map((item, index) => (
        <div key={`${item.connectionId}-${item.tableName}-${item.recordId}`} className="flex items-center gap-2">
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
          )}
          
          <button
            onClick={() => onNavigate(item, index)}
            className={cn(
              'flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors',
              'text-gray-700 hover:text-gray-900',
              index === items.length - 1 ? 'font-medium text-gray-900' : 'text-gray-600'
            )}
            disabled={index === items.length - 1}
          >
            <ItemIcon 
              item={{ icon: (item.tableInfo?.details?.icon as TIconName) || 'Table' }}
              className="w-4 h-4 flex-shrink-0" 
            />
            <span className="truncate max-w-32">
              {item.displayValue || `${item.tableInfo?.details?.singularName || item.tableName} ${item.recordId}`}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}