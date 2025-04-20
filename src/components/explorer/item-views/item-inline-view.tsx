import { cn } from '@/lib/utils';
import { FileQuestion, icons } from 'lucide-react';
import { Primitive } from 'zod';
import { TIconName } from './item-icon';

export function ItemInlineView({
  item,
  ...props
}: {
  item: {
    /** @deprecated Use `columns` instead */
    name?: string;
    icon: TIconName;
    columns: { name: string; value: Exclude<Primitive, symbol> }[];
  };
} & React.HTMLAttributes<HTMLDivElement>) {
  const IconComponent = icons[item.icon as keyof typeof icons] || FileQuestion;
  const [name, ...columns] = item.name
    ? [{ name: 'name', value: item.name }, ...item.columns]
    : item.columns;

  return (
    <div
      {...props}
      className={cn(
        'flex flex-row items-center gap-1 px-2 py-1 rounded-md text-xs',
        props.className
      )}
    >
      <IconComponent className="size-4" />
      {name?.value}
      {columns?.map((column) => (
        <span key={column.name}>{column.value}</span>
      ))}
    </div>
  );
}
