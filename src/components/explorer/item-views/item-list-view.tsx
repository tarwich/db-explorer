import { cn } from '@/lib/utils';
import { ItemIcon, TIconName } from './item-icon';
import { ReactNode } from 'react';

export function ItemListView({
  item,
  rightElement,
}: {
  item: {
    id: string;
    icon: TIconName;
    columns: { name: string; value: string; icon?: string }[];
  };
  rightElement?: ReactNode;
}) {

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-md',
        'flex flex-row items-center gap-4 p-3'
      )}
    >
      <ItemIcon item={item} />

      <div className="flex-1 flex flex-row flex-wrap gap-4 min-w-0">
        {item.columns.map((column, index) => (
          <div
            key={column.name}
            className={cn(
              'min-w-[120px] shrink-0',
              // Show first and last columns always, hide others when space is tight
              index !== 0 && index !== item.columns.length - 1
                ? 'hidden md:block'
                : 'block',
              // Grow the last column to fill space
              index === item.columns.length - 1 && 'md:flex-1'
            )}
          >
            <div className="text-xs text-gray-500">{column.name}</div>
            <div className="text-sm font-medium truncate flex items-center gap-1">
              {column.icon && <ItemIcon item={{ icon: column.icon }} />}
              {column.value}
            </div>
          </div>
        ))}
      </div>

      {rightElement}
    </div>
  );
}
