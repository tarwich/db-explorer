import { cn } from '@/lib/utils';
import { ItemIcon, TIconName } from './item-icon';
import { ReactNode } from 'react';

export function ItemCardView({
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
  const [firstColumn, ...restColumns] = item.columns || [];

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-md',
        'min-h-24',
        'flex flex-col gap-2 p-2'
      )}
    >
      <div className="flex flex-row gap-2 items-center">
        <ItemIcon item={item} />

        <h1 className="text-sm font-medium text-gray-900 text-ellipsis overflow-hidden flex-1">
          {firstColumn?.value || `(No ${firstColumn?.name})`}
        </h1>

        {rightElement}
      </div>
      {restColumns.map((c) => (
        <p
          key={c.name}
          className="text-xs text-gray-500 text-ellipsis overflow-hidden w-full truncate flex items-center gap-1"
        >
          {c.icon && <ItemIcon item={{ icon: c.icon }} />}
          {c.value}
        </p>
      ))}
    </div>
  );
}
