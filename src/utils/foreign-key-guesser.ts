import { DatabaseTable, TableColumn } from '@/stores/database';
import { noCase } from 'change-case';

interface ForeignKeyGuess {
  sourceColumn: string;
  targetSchema: string;
  targetTable: string;
  targetColumn: string;
  confidence: number;
}

const ID_REGEX = /\b(id|uuid|guid)$/g;

const NO_MATCH: ForeignKeyGuess = {
  sourceColumn: '',
  targetSchema: '',
  targetTable: '',
  targetColumn: '',
  confidence: 0,
};

const singularize = (name: string): string => {
  return name.replace(
    /(?:s|ies)$/,
    (match) =>
      ({
        s: '',
        ies: 'y',
      }[match] || '')
  );
};

/**
 * Normalize any name by changing it to singular and making it lowercase space
 * separated
 *
 * @example
 * normalize('users') -> 'user'
 * normalize('user') -> 'user'
 * normalize('user_id') -> 'user id'
 * normalize('user_ids') -> 'user id'
 */
function normalize(name: string): string {
  return singularize(noCase(name));
}

function isIdColumn(column: TableColumn): boolean {
  // Only allow id, uuid, or guid columns to be guessed as foreign keys
  if (column.data_type !== 'integer' && column.data_type !== 'uuid') {
    return false;
  }

  if (ID_REGEX.test(column.column_name)) {
    return true;
  }

  return false;
}

export function guessForeignKeys(
  sourceColumns: TableColumn[],
  allTables: DatabaseTable[]
): ForeignKeyGuess[] {
  const normalizedTableNames = allTables.map((table) => ({
    normalized: normalize(table.name),
    original: table.name,
  }));

  return sourceColumns.map((column) => {
    const normalized = normalize(column.column_name)
      .replace(ID_REGEX, '')
      .trim();

    if (!normalized) {
      return NO_MATCH;
    }

    const matches = normalizedTableNames.filter((table) =>
      table.normalized.includes(normalized)
    );

    if (matches.length > 0) {
      const originalTable = allTables.find(
        (table) => table.name === matches[0].original
      )!;

      return {
        sourceColumn: column.column_name,
        targetSchema: originalTable.schema,
        targetTable: originalTable.name,
        targetColumn: 'id',
        confidence: 1,
      };
    }

    return NO_MATCH;
  });
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
