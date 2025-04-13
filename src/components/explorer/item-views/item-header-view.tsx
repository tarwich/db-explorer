import { ICollection, IExplorerItem } from '../types';
import { ItemIcon } from './item-icon';

export function ItemHeaderView({
  item,
}: {
  item: IExplorerItem | ICollection;
}) {
  const pluralName = ('pluralName' in item ? item.pluralName : '') || item.name;

  return (
    <div className="flex flex-row items-center gap-2 text-xl font-bold">
      <ItemIcon item={item} className="size-6" />
      <div className="">{pluralName}</div>
    </div>
  );
}
