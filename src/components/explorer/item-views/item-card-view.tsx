import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Ellipsis } from 'lucide-react';
import { ItemIcon, TIconName } from './item-icon';

export function ItemCardView({
  item,
  onMenuClick,
}: {
  item: {
    id: string;
    name: string;
    subName: string;
    icon: TIconName;
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
        'min-h-24',
        'flex flex-col gap-2 p-2'
      )}
    >
      <div className="flex flex-row gap-2 items-center">
        <ItemIcon item={item} />

        <h1 className="text-sm font-medium text-gray-900 text-ellipsis overflow-hidden flex-1">
          {item.name}
        </h1>

        {onMenuClick && (
          <Button variant="ghost" size="icon" onClick={handleMenuClick}>
            <Ellipsis className="w-4 h-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-gray-500 text-ellipsis overflow-hidden">
        {item.subName}
      </p>
    </div>
  );
}
