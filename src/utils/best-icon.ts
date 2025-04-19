'use server';

import { TIconName } from '@/components/explorer/item-views/item-icon';
import Fuse from 'fuse.js';
import { sort } from 'radash';
import typeIconDictionary from './data-type-icons.json';
import iconDictionary from './icon-database.json';

type IconEntry = (typeof iconDictionary)[number];
type TypeIconEntry = (typeof typeIconDictionary)[number];

let generalIconFuse: Fuse<IconEntry> | undefined;
let typeIconFuse: Fuse<TypeIconEntry> | undefined;

export async function getBestIcon(sentence: string): Promise<TIconName> {
  if (!generalIconFuse) {
    generalIconFuse = new Fuse(iconDictionary, {
      includeScore: true,
      threshold: 0.2,
      keys: ['name', 'normalized', 'synonyms'],
    });
  }

  const results = sort(
    generalIconFuse.search(sentence, { limit: 3 }),
    (r) => r.score || 0
  );

  if (!results.length) return 'Box';

  return results[0].item.name as TIconName;
}

export async function getBestIconForType(type: string): Promise<TIconName> {
  if (!typeIconFuse) {
    typeIconFuse = new Fuse(typeIconDictionary, {
      includeScore: true,
      threshold: 0.2,
      keys: ['name', 'icon', 'synonyms'],
    });
  }

  const results = sort(
    typeIconFuse.search(type, { limit: 3 }),
    (r) => r.score || 0
  );

  if (!results.length) return 'FileQuestion';

  return results[0].item.icon as TIconName;
}
