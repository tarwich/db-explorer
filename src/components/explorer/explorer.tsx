'use client';

import { ItemHeaderView } from './item-views/item-header-view';
import { ICollection } from './types';

export function Explorer({ collection }: { collection: ICollection }) {
  return (
    <div className="flex flex-col bg-white">
      {/* Header */}
      <div className="flex flex-row border-b border-gray-200 p-2">
        <ItemHeaderView item={collection} />
      </div>
    </div>
  );
}
