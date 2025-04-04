import { DatabaseTable, TableColumn } from '@/stores/database';
import { kebabCase } from 'change-case';

interface ForeignKeyGuess {
  sourceColumn: string;
  targetSchema: string;
  targetTable: string;
  targetColumn: string;
  confidence: number;
}

const COMMON_ID_SUFFIXES = [
  '_id',
  'Id',
  '_ID',
  'ID',
  '_uid',
  'Uid',
  '_UID',
  'UID',
  'id',
  'Id',
  'ID',
];

function normalizeColumnName(name: string): string {
  // First convert the name to kebab case
  let normalized = kebabCase(name);

  // Special handling for ID suffix - convert to lowercase before kebab case processing
  // This handles cases like accountID -> account-id
  normalized = normalized.replace(/-?i-?d$/, '');

  // Convert kebab-case to snake_case
  normalized = normalized.replace(/-/g, '_');

  // Remove all common ID suffixes (case-insensitive)
  const withoutSuffix = COMMON_ID_SUFFIXES.reduce(
    (result, suffix) => result.replace(new RegExp(`${suffix}$`, 'i'), ''),
    normalized
  );

  // Clean up any trailing underscores
  return withoutSuffix.replace(/_+$/, '');
}

function normalizeAndPluralize(name: string): string[] {
  const singular = normalizeColumnName(name);
  const forms = [singular];

  // Add plural forms
  if (singular.endsWith('y')) {
    // company -> companies
    forms.push(singular.slice(0, -1) + 'ies');
  } else if (
    singular.endsWith('s') ||
    singular.endsWith('x') ||
    singular.endsWith('z') ||
    singular.endsWith('ch') ||
    singular.endsWith('sh')
  ) {
    // class -> classes, box -> boxes, buzz -> buzzes, match -> matches, dish -> dishes
    forms.push(singular + 'es');
  } else {
    // account -> accounts
    forms.push(singular + 's');
  }

  return forms;
}

export function guessForeignKeys(
  sourceColumns: TableColumn[],
  allTables: DatabaseTable[],
  currentSchema: string
): ForeignKeyGuess[] {
  console.log(
    'Guessing foreign keys for columns:',
    sourceColumns.map((c) => c.column_name)
  );
  console.log(
    'Available tables:',
    allTables.map((t) => `${t.schema}.${t.name}`)
  );

  const guesses: ForeignKeyGuess[] = [];

  for (const column of sourceColumns) {
    const columnName = column.column_name;
    const normalizedForms = normalizeAndPluralize(columnName);

    console.log(`\nAnalyzing column: ${columnName}`);
    console.log('Normalized forms:', normalizedForms);

    // Skip if it's a primary key or non-numeric type
    if (
      columnName.toLowerCase() === 'id' ||
      !['integer', 'bigint', 'smallint', 'numeric'].includes(
        column.data_type.toLowerCase()
      )
    ) {
      console.log('Skipping column - primary key or non-numeric type');
      continue;
    }

    // Look for potential target tables
    for (const targetTable of allTables) {
      const targetTableNormalized = normalizeColumnName(targetTable.name);
      console.log(`\nComparing with table: ${targetTable.name}`);
      console.log('Normalized table name:', targetTableNormalized);

      let confidence = 0;

      // Case 1: Direct match after normalization (e.g., company_id → company or companies)
      if (normalizedForms.includes(targetTableNormalized)) {
        confidence = 0.9;
        console.log('Direct match found! Confidence:', confidence);
      }
      // Case 2: Column contains table name (e.g., primary_company_id → company)
      else if (
        normalizedForms.some((form) => form.includes(targetTableNormalized))
      ) {
        confidence = 0.7;
        console.log('Column contains table name! Confidence:', confidence);
      }
      // Case 3: Table name contains column name (e.g., user_id → system_users)
      else if (
        normalizedForms.some((form) => targetTableNormalized.includes(form))
      ) {
        confidence = 0.5;
        console.log('Table name contains column name! Confidence:', confidence);
      }

      // Add additional confidence if:
      // 1. The column name ends with a common ID suffix (case-insensitive)
      if (
        COMMON_ID_SUFFIXES.some((suffix) =>
          columnName.toLowerCase().endsWith(suffix.toLowerCase())
        )
      ) {
        confidence += 0.1;
        console.log('Has ID suffix! New confidence:', confidence);
      }
      // 2. The tables are in the same schema
      if (targetTable.schema === currentSchema) {
        confidence += 0.1;
        console.log('Same schema! New confidence:', confidence);
      }
      // 3. The column type matches typical ID types
      if (['integer', 'bigint'].includes(column.data_type.toLowerCase())) {
        confidence += 0.1;
        console.log('Matches ID type! New confidence:', confidence);
      }

      // Only include guesses with sufficient confidence
      if (confidence >= 0.5) {
        console.log('Adding guess with confidence:', confidence);
        guesses.push({
          sourceColumn: column.column_name,
          targetSchema: targetTable.schema,
          targetTable: targetTable.name,
          targetColumn: 'id', // Assuming target column is always 'id' for now
          confidence,
        });
      }
    }
  }

  // Sort by confidence and remove duplicates favoring higher confidence
  const finalGuesses = guesses
    .sort((a, b) => b.confidence - a.confidence)
    .filter(
      (guess, index, array) =>
        array.findIndex(
          (g) =>
            g.sourceColumn === guess.sourceColumn &&
            g.confidence >= guess.confidence
        ) === index
    );

  console.log('\nFinal guesses:', finalGuesses);
  return finalGuesses;
}

export function combineActualAndGuessedForeignKeys(
  column: TableColumn,
  guessedForeignKeys: ForeignKeyGuess[]
): TableColumn {
  // If it's already a foreign key, return as is
  if (column.foreign_table_name) {
    return column;
  }

  // Find the highest confidence guess for this column
  const guess = guessedForeignKeys.find(
    (g) => g.sourceColumn === column.column_name
  );

  if (!guess) {
    return column;
  }

  return {
    ...column,
    foreign_table_schema: guess.targetSchema,
    foreign_table_name: guess.targetTable,
    foreign_column_name: guess.targetColumn,
    is_guessed_foreign_key: true,
    foreign_key_confidence: guess.confidence,
  };
}
