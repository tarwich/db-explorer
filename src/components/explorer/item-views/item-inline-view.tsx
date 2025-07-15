import { cn } from '@/lib/utils';
import { FileQuestion, icons } from 'lucide-react';
import { Primitive } from 'zod';
import { TIconName } from './item-icon';

export function ItemInlineView({
  item,
  leftElement,
  ...props
}: {
  item: {
    /** @deprecated Use `columns` instead */
    name?: string;
    icon?: TIconName;
    columns: { name: string; value: Exclude<Primitive, symbol> }[];
  };
  leftElement?: React.ReactElement;
} & React.HTMLAttributes<HTMLDivElement>) {
  const IconComponent = item.icon
    ? icons[item.icon as keyof typeof icons] || FileQuestion
    : null;
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
      {leftElement || (IconComponent && <IconComponent className="size-4" />)}
      <div className="flex flex-row items-center gap-1">
        <span>{name?.value}</span>
        {columns.map((column, index) => (
          <span key={index} className="text-neutral-500">
            {column.value}
          </span>
        ))}
      </div>
    </div>
  );
}
