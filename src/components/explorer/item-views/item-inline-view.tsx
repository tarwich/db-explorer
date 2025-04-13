import { cn } from '@/lib/utils';
import { FileQuestion, icons } from 'lucide-react';
import { IExplorerItem } from '../types';

export function ItemInlineView({
  item,
  ...props
}: { item: IExplorerItem } & React.HTMLAttributes<HTMLDivElement>) {
  const IconComponent = icons[item.icon as keyof typeof icons] || FileQuestion;

  return (
    <div
      {...props}
      className={cn(
        'flex flex-row items-center gap-2 p-2 rounded-md',
        props.className
      )}
    >
      <IconComponent className="size-4" />
      {item.name}
    </div>
  );
}
