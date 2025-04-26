import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Ellipsis } from 'lucide-react';
import { ItemIcon, TIconName } from './item-icon';

export function ItemListView({
  item,
  onMenuClick,
}: {
  item: {
    id: string;
    icon: TIconName;
    columns: { name: string; value: string }[];
  };
  onMenuClick?: () => void;
}) {
  const handleMenuClick = onMenuClick
    ? (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        onMenuClick();
      }
    : undefined;

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
            <div className="text-sm font-medium truncate">{column.value}</div>
          </div>
        ))}
      </div>

      {onMenuClick && (
        <Button variant="ghost" size="icon" onClick={handleMenuClick}>
          <Ellipsis className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
