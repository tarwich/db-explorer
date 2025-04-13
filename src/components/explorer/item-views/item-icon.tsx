import { icons } from 'lucide-react';
import { ComponentProps } from 'react';
import { ICollection, IExplorerItem } from '../types';

export function ItemIcon({
  item,
  ...props
}: {
  item: IExplorerItem | ICollection;
} & ComponentProps<(typeof icons)[keyof typeof icons]>) {
  const TheIcon =
    icons[item.icon] ?? (item.type === 'collection' ? icons.Boxes : icons.Box);

  return <TheIcon className="size-4" {...props} />;
}
