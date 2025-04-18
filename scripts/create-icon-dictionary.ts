import { icons } from 'lucide-react';
// import { BayesClassifier, WordNet } from 'natural';
import { parseArgs } from 'node:util';
import { title } from 'radash';

const { BayesClassifier, WordNet } = await import('natural').then(
  (m) => m.default
);

/** @typedef {import('natural').WordNet} WordNet */
/** @typedef {import('natural').BayesClassifier} BayesClassifier */

const ICON_NAMES = Object.keys(icons);

async function main() {
  const classifier = new BayesClassifier();
  const wordnet = new WordNet();

  const {
    values: { output: outputFile },
  } = parseArgs({
    options: {
      output: { type: 'string', short: 'o' },
    },
  });

  if (!outputFile) {
    throw new Error(`Usage: ${process.argv[1]} -o <output file>`);
  }

  for (const name of ICON_NAMES) {
    const tokens = title(name).toLowerCase().split(' ');
    const withSynonyms = await addSynonyms(tokens, wordnet);
    classifier.addDocument(withSynonyms, name);
  }

  classifier.train();

  await new Promise((resolve, reject) =>
    classifier.save(outputFile, (err, classifier) => {
      if (err) {
        reject(err);
      }
      resolve(classifier);
    })
  );
}

/**
 * @param {string} word
 * @param {WordNet} wordnet
 */
function lookup(
  word: string,
  wordnet: WordNet
): Promise<Parameters<Parameters<WordNet['lookup']>[1]>[0]> {
  return new Promise((ok) => wordnet.lookup(word, ok));
}

const addSynonyms = async (tokens: string[], wordnet: WordNet) => {
  const results = await Promise.all(
    tokens.map(async (token) => {
      const wordnetResults = await lookup(token, wordnet);
      const synonyms = wordnetResults.flatMap((r) => r.synonyms);
      return [token, ...synonyms];
    })
  );
  return results.flat();
};

main();
