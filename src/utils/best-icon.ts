'use server';

import { TIconName } from '@/components/explorer/item-views/item-icon';
import Fuse from 'fuse.js';
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
      threshold: 0.3, // Slightly stricter threshold for better matches
      keys: [
        { name: 'synonyms', weight: 0.6 }, // Prioritize synonyms for exact concept matches
        { name: 'normalized', weight: 0.3 }, // Then normalized names
        { name: 'name', weight: 0.1 }, // Finally icon names (least priority)
      ],
    });
  }

  const results = generalIconFuse.search(sentence, { limit: 5 });
  
  // Sort by score (lower is better in Fuse.js)
  const sortedResults = results.sort((a, b) => (a.score || 0) - (b.score || 0));

  if (!sortedResults.length) return 'Box';

  return sortedResults[0].item.name as TIconName;
}

export async function getBestIconForType(type: string): Promise<TIconName> {
  if (!typeIconFuse) {
    typeIconFuse = new Fuse(typeIconDictionary, {
      includeScore: true,
      threshold: 0.3, // Slightly stricter threshold
      keys: [
        { name: 'synonyms', weight: 0.6 }, // Prioritize synonyms
        { name: 'name', weight: 0.4 }, // Then exact type names
      ],
    });
  }

  const results = typeIconFuse.search(type, { limit: 5 });
  
  // Sort by score (lower is better in Fuse.js)
  const sortedResults = results.sort((a, b) => (a.score || 0) - (b.score || 0));

  if (!sortedResults.length) return 'FileQuestion';

  return sortedResults[0].item.icon as TIconName;
}
