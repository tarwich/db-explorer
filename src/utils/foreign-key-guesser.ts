import { ColumnInformation, DatabaseTable } from '@/types/connections';

type DatabaseTableColumn = ColumnInformation;

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

function isIdColumn(column: DatabaseTableColumn): boolean {
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
  sourceColumns: DatabaseTableColumn[],
  allTables: DatabaseTable[]
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
        Object.values(originalTable.details.columns || {}).find(isIdColumn)?.name ||
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
