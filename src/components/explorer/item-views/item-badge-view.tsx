import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ComponentProps } from 'react';
import { ICollection, IExplorerItem } from '../types';
import { Colors } from './item-colors';
import { ItemIcon } from './item-icon';

export function ItemBadgeView({
  item,
  ...props
}: {
  item: Pick<IExplorerItem | ICollection, 'name' | 'icon' | 'type' | 'color'>;
} & ComponentProps<typeof Badge>) {
  return (
    <Badge
      variant="outline"
      {...props}
      className={cn(
        'flex flex-row gap-1 items-center',
        props.className,
        Colors[item.color || 'slate']
      )}
    >
      <ItemIcon item={item} />
      {item.name}
    </Badge>
  );
}
