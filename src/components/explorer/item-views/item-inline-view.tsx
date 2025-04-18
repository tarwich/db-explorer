import { cn } from '@/lib/utils';
import { FileQuestion, icons } from 'lucide-react';
import { TIconName } from './item-icon';

export function ItemInlineView({
  item,
  ...props
}: {
  item: {
    name: string;
    icon: TIconName;
  };
} & React.HTMLAttributes<HTMLDivElement>) {
  const IconComponent = icons[item.icon as keyof typeof icons] || FileQuestion;

  return (
    <div
      {...props}
      className={cn(
        'flex flex-row items-center gap-1 px-2 py-1 rounded-md text-xs',
        props.className
      )}
    >
      <IconComponent className="size-4" />
      {item.name}
    </div>
  );
}
