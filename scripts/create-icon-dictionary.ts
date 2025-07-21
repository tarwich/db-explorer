import { writeFileSync } from 'fs';
import Fuse from 'fuse.js';
import { icons } from 'lucide-react';
import { sort, unique } from 'radash';
import type { Synset } from 'wordpos';
import WordPOS from 'wordpos';
import { normalizeName } from '../src/utils/normalize-name';

const ICON_NAMES = Object.keys(icons);

const database = ICON_NAMES.map((name) => ({
  name,
  normalized: normalizeName(name),
  synonyms: [],
}));

writeFileSync('database.json', JSON.stringify(database, null, 2));

const lookup = async (word: string, wordpos: WordPOS) => {
  return new Promise<Synset[]>((ok) => {
    wordpos.lookup(word, ok);
  });
};

const getAllSynonyms = async (word: string, wordpos: WordPOS) => {
  return unique(
    (
      await Promise.all(
        word.split(/\W+/).map(async (word) => {
          const results = await lookup(word, wordpos);
          return results.flatMap((r) => r.synonyms);
        })
      )
    ).flat()
  );
};

const recursiveSearch = async (
  phrase: string,
  fuse: Fuse<any>,
  wordpos: WordPOS,
  maxDepth: number = 3,
  currentDepth: number = 0,
  visited: Set<string> = new Set()
): Promise<any[]> => {
  if (currentDepth >= maxDepth) {
    return [];
  }

  const synonyms = await getAllSynonyms(phrase, wordpos);
  console.log({ phrase, synonyms });
  const results: any[] = [];

  for (const synonym of synonyms) {
    if (visited.has(synonym)) continue;
    visited.add(synonym);

    results.push(...fuse.search(synonym, { limit: 2 }));
  }

  if (results.length === 0) {
    // If no results found, recursively search with this synonym
    const deeperResults = await recursiveSearch(
      synonyms.join(' '),
      fuse,
      wordpos,
      maxDepth,
      currentDepth + 1,
      visited
    );

    results.push(...deeperResults);
  }

  return sort(results, (r) => r.score ?? Infinity);
};

export async function main() {
  const wordpos = new WordPOS();

  const dictionary = await Promise.all(
    ICON_NAMES.map(async (name) => {
      const normalized = normalizeName(name);
      const synonyms = await getAllSynonyms(normalized, wordpos);

      return { name, normalized, synonyms };
    })
  );

  const fuse = new Fuse(dictionary, {
    includeScore: true,
    threshold: 0.2,
    keys: ['name', 'normalized', 'synonyms'],
  });

  const search = 'employee';
  const results = await recursiveSearch(search, fuse, wordpos, 10);
  console.log([results[0]]);
}

main().catch(console.error);
