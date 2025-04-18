import { icons } from 'lucide-react';
import { ComponentProps } from 'react';

export type TIconName = keyof typeof icons;

export const Icons = icons;

export function ItemIcon({
  item,
  ...props
}: {
  item: {
    icon: string;
  };
} & ComponentProps<(typeof icons)[keyof typeof icons]>) {
  const TheIcon = Icons[item.icon as TIconName] || Icons.Box;

  return <TheIcon className="size-4" {...props} />;
}
