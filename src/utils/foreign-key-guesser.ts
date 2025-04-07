import { TableColumn } from '@/stores/database';
import { DeserializedTable } from '@/types/connections';

type DeserializedTableColumn = DeserializedTable['details']['columns'][number];

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

function isIdColumn(column: DeserializedTableColumn): boolean {
  // Only allow id, uuid, or guid columns to be guessed as foreign keys
  if (column.type !== 'integer' && column.type !== 'uuid') {
    return false;
  }

  if (ID_REGEX.test(column.normalizedName)) {
    return true;
  }

  return false;
}

export function guessForeignKeys(
  sourceColumns: DeserializedTable['details']['columns'],
  allTables: DeserializedTable[]
): ForeignKeyGuess[] {
  return sourceColumns.map((column) => {
    const normalized = column.normalizedName.replace(ID_REGEX, '').trim();

    if (!normalized) {
      return NO_MATCH;
    }

    const matches = allTables.filter(
      (table) => table.details.normalizedName === normalized
    );

    if (matches.length > 0) {
      const originalTable = matches[0];

      const idColumn =
        originalTable.details.columns?.find(isIdColumn)?.name ||
        originalTable.details.pk[0];

      if (!idColumn) {
        return NO_MATCH;
      }

      return {
        sourceColumn: column.name,
        targetSchema: originalTable.schema,
        targetTable: originalTable.name,
        targetColumn: idColumn,
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
  if (column.foreignKey) {
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
    foreignKey: {
      columnName: guess.sourceColumn,
      targetSchema: guess.targetSchema,
      targetTable: guess.targetTable,
      targetColumn: guess.targetColumn,
      isGuessed: true,
      confidence: guess.confidence,
    },
  };
}
