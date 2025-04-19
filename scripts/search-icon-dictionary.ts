import Fuse from 'fuse.js';
import iconDictionary from '../src/utils/icon-database.json';

type IconEntry = (typeof iconDictionary)[number];

const user = iconDictionary.find((icon) => icon.name === 'User');
console.log(user);

async function searchIcons(searchTerm: string) {
  try {
    // Initialize Fuse.js with the database
    const fuse = new Fuse<IconEntry>(iconDictionary, {
      includeScore: true,
      threshold: 0.2,
      keys: ['name', 'normalized', 'synonyms'],
    });

    // Perform the search
    const results = fuse.search(searchTerm, { limit: 3 });

    // Log the results
    console.log(`Search results for "${searchTerm}":`);
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.item.name}`);
      console.log(`   Score: ${result.score}`);
      console.log(`   Synonyms: ${result.item.synonyms.join(', ')}`);
    });

    return results;
  } catch (error) {
    console.error('Error searching icons:', error);
    throw error;
  }
}

// Example usage
searchIcons('appointment').catch(console.error);
