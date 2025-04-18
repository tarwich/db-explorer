import { TIconName } from '@/components/explorer/item-views/item-icon';
import { icons } from 'lucide-react';
import { BayesClassifier, WordNet } from 'natural';
import * as iconDictionary from './icon-dictionary.json';

const ICON_NAMES = Object.keys(icons);

let classifier: BayesClassifier | undefined;
const wordnet = new WordNet();

type CallbackToPromise<T extends (...args: any[]) => any> = Parameters<
  Parameters<T>[1]
>[0];

export async function getBestIcon(sentence: string): Promise<TIconName> {
  if (!classifier) {
    classifier = BayesClassifier.restore({ ...iconDictionary });
  }

  // if (!classifier) return 'Box';

  const synonyms = await new Promise<CallbackToPromise<typeof wordnet.lookup>>(
    (ok) => wordnet.lookup(sentence, ok)
  ).then((r) => r.flatMap((r) => r.synonyms));
  const result = classifier.classify(`${sentence} ${synonyms.join(' ')}`);
  console.log({ sentence, result });

  return result as TIconName;
}
