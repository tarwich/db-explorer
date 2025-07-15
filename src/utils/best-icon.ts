'use server';

import { TIconName } from '@/components/explorer/item-views/item-icon';
import Fuse from 'fuse.js';
import typeIconDictionary from './data-type-icons.json';
import iconDictionary from './icon-database.json';

type IconEntry = (typeof iconDictionary)[number];
type TypeIconEntry = (typeof typeIconDictionary)[number];

let generalIconFuse: Fuse<IconEntry> | undefined;
let typeIconFuse: Fuse<TypeIconEntry> | undefined;

// Aviation-specific mappings for better domain context
const AVIATION_MAPPINGS = {
  'squawks': 'AlertTriangle',
  'squawk': 'AlertTriangle',
  'duty logs': 'Clock',
  'duty log': 'Clock',
  'flight logs': 'ScrollText',
  'flight log': 'ScrollText',
  'aircraft maintenance': 'Wrench',
  'aircraft maintenances': 'Wrench',
  'maintenance': 'Wrench',
  'maintenances': 'Wrench',
  'aircraft engines': 'Cog',
  'aircraft engine': 'Cog',
  'engines': 'Cog',
  'engine': 'Cog',
  'aircraft models': 'Plane',
  'aircraft model': 'Plane',
  'aircraft classes': 'Plane',
  'aircraft class': 'Plane',
  'aircraft schedule': 'Calendar',
  'aircraft schedules': 'Calendar',
  'flight stats': 'BarChart3',
  'flight statistics': 'BarChart3',
  'hangars': 'Building',
  'hangar': 'Building',
  'airports': 'MapPin',
  'airport': 'MapPin',
  'faa airports': 'MapPin',
  'faa airport': 'MapPin',
  'faaairports': 'MapPin',
  'faaairport': 'MapPin',
  'aircraft qualifications': 'Certificate',
  'aircraft qualification': 'Certificate',
  'qualifications': 'Certificate',
  'qualification': 'Certificate',
  'training requirements': 'GraduationCap',
  'training requirement': 'GraduationCap',
  'training histories': 'BookOpen',
  'training history': 'BookOpen',
  'trainings': 'BookOpen',
  'training': 'BookOpen',
  'crew': 'Users',
  'crews': 'Users',
  'passengers': 'User',
  'passenger': 'User',
  'trip legs': 'Route',
  'trip leg': 'Route',
  'bookings': 'Calendar',
  'booking': 'Calendar',
  'pricing profiles': 'DollarSign',
  'pricing profile': 'DollarSign',
  'reminders': 'Bell',
  'reminder': 'Bell',
  'biases': 'Target',
  'bias': 'Target',
};

// Common domain patterns for better matching
const DOMAIN_PATTERNS = {
  // Logging and tracking
  'activity log': 'Activity',
  'activity logs': 'Activity',
  'audit log': 'FileCheck',
  'audit logs': 'FileCheck',
  'log': 'ScrollText',
  'logs': 'ScrollText',
  'history': 'History',
  'histories': 'History',

  // Financial
  'currency': 'DollarSign',
  'currencies': 'DollarSign',
  'pricing': 'DollarSign',
  'quote': 'Quote',
  'quotes': 'Quote',
  'billing': 'Receipt',

  // User management
  'account': 'User',
  'accounts': 'User',
  'admin': 'Shield',
  'admins': 'Shield',
  'user': 'User',
  'users': 'User',

  // Organization
  'company': 'Building',
  'companies': 'Building',
  'organization': 'Building',
  'organizations': 'Building',

  // Communication
  'notification': 'Bell',
  'notifications': 'Bell',
  'message': 'MessageSquare',
  'messages': 'MessageSquare',
  'inbox': 'Inbox',

  // Configuration
  'setting': 'Settings',
  'settings': 'Settings',
  'config': 'Settings',
  'configuration': 'Settings',
  'preference': 'Settings',
  'preferences': 'Settings',

  // Metadata
  'tag': 'Tag',
  'tags': 'Tag',
  'meta': 'Hash',
  'metas': 'Hash',
  'metadata': 'Hash',
  'item tag': 'Tag',
  'item tags': 'Tag',

  // Scheduling
  'schedule': 'Calendar',
  'schedules': 'Calendar',
  'schedule item': 'Calendar',
  'schedule items': 'Calendar',

  // Resources
  'resource': 'Package',
  'resources': 'Package',

  // System
  'integration': 'Zap',
  'integrations': 'Zap',
  'memory': 'Database',
  'memories': 'Database',
  'cache': 'Database',
  'caches': 'Database',

  // Filtering
  'filter': 'Filter',
  'filters': 'Filter',
  'inbox filter': 'Filter',
  'inbox filters': 'Filter',

  // Requests
  'request': 'Send',
  'requests': 'Send',
  'management request': 'Send',
  'management requests': 'Send',

  // Transactions
  'transaction': 'CreditCard',
  'transactions': 'CreditCard',
  'notification transaction': 'CreditCard',
  'notification transactions': 'CreditCard',

  // External systems
  'quickbooks': 'Calculator',
  'quickbook': 'Calculator',
  'cron': 'Clock',
  'sequelize': 'Database',
};

export async function getBestIcon(sentence: string): Promise<TIconName> {
  if (!generalIconFuse) {
    generalIconFuse = new Fuse(iconDictionary, {
      includeScore: true,
      threshold: 0.3,
      keys: [
        { name: 'synonyms', weight: 0.6 },
        { name: 'normalized', weight: 0.3 },
        { name: 'name', weight: 0.1 },
      ],
    });
  }

  const normalizedSentence = sentence.toLowerCase().trim();

  // 1. Check aviation-specific mappings first
  const aviationMatch =
    AVIATION_MAPPINGS[normalizedSentence as keyof typeof AVIATION_MAPPINGS];
  if (aviationMatch) {
    return aviationMatch as TIconName;
  }

  // 2. Check common domain patterns
  const domainMatch =
    DOMAIN_PATTERNS[normalizedSentence as keyof typeof DOMAIN_PATTERNS];
  if (domainMatch) {
    return domainMatch as TIconName;
  }

  // 3. Try fuzzy search with the full sentence
  const results = generalIconFuse.search(normalizedSentence, { limit: 5 });
  const sortedResults = results.sort((a, b) => (a.score || 0) - (b.score || 0));

  if (sortedResults.length > 0 && (sortedResults[0].score || 0) < 0.5) {
    return sortedResults[0].item.name as TIconName;
  }

  // 4. Try breaking down compound words and prioritize the most specific part
  const words = normalizedSentence
    .split(/[\s_-]+/)
    .filter((word) => word.length > 2);

  if (words.length > 1) {
    // Check each word against our mappings
    for (const word of words) {
      const aviationWordMatch =
        AVIATION_MAPPINGS[word as keyof typeof AVIATION_MAPPINGS];
      if (aviationWordMatch) {
        return aviationWordMatch as TIconName;
      }

      const domainWordMatch =
        DOMAIN_PATTERNS[word as keyof typeof DOMAIN_PATTERNS];
      if (domainWordMatch) {
        return domainWordMatch as TIconName;
      }
    }

    // Try fuzzy search on individual words, prioritizing later words (more specific)
    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i];
      const wordResults = generalIconFuse.search(word, { limit: 3 });
      const sortedWordResults = wordResults.sort(
        (a, b) => (a.score || 0) - (b.score || 0)
      );

      if (
        sortedWordResults.length > 0 &&
        (sortedWordResults[0].score || 0) < 0.4
      ) {
        return sortedWordResults[0].item.name as TIconName;
      }
    }
  }

  // 5. Final fallback to generic search
  if (sortedResults.length > 0) {
    return sortedResults[0].item.name as TIconName;
  }

  return 'Box';
}

export async function getBestIconForType(type: string): Promise<TIconName> {
  if (!typeIconFuse) {
    typeIconFuse = new Fuse(typeIconDictionary, {
      includeScore: true,
      threshold: 0.3,
      keys: [
        { name: 'synonyms', weight: 0.6 },
        { name: 'name', weight: 0.4 },
      ],
    });
  }

  const results = typeIconFuse.search(type, { limit: 5 });
  const sortedResults = results.sort((a, b) => (a.score || 0) - (b.score || 0));

  if (!sortedResults.length) return 'FileQuestion';

  return sortedResults[0].item.icon as TIconName;
}
