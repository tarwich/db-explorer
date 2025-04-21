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

      <div className="flex-1 flex flex-row gap-4 overflow-x-auto">
        {item.columns.map((column) => (
          <div key={column.name} className="min-w-[120px]">
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
