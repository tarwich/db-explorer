import { Kysely } from 'kysely';
import { SqliteParseResult } from '../parsers/sqlite/parser';
import * as sqliteParser from '../parsers/sqlite/parser.mjs';
import { IDatabasePlugin } from './plugin';

export class SqlitePlugin implements IDatabasePlugin {
  name = 'sqlite';

  constructor(private readonly db: Kysely<any>) {}

  async listTables({ schema = 'main' }: { schema?: string } = {}) {
    return this.db
      .selectFrom('sqlite_master')
      .select(['name', 'type'])
      .where('type', '=', 'table')
      .execute()
      .then((rows) =>
        rows.map((row) => ({
          name: row.name,
          schema: 'main',
        }))
      );
  }

  async describeTable(table: string) {
    return this.db
      .selectFrom('sqlite_master')
      .select(['sql'])
      .where('name', '=', table)
      .where('type', '=', 'table')
      .execute()
      .then((rows) => {
        if (rows.length === 0) {
          return [];
        }

        const createTableSQL = rows[0].sql as string;

        const [, columnStanza] =
          createTableSQL
            .replace(/[\r\n]+/g, ' ')
            .match(/CREATE\s+TABLE\s+"?\w+"?\s+\((.+)\)/i) ?? [];

        if (!columnStanza) {
          return [];
        }

        const statements: SqliteParseResult =
          sqliteParser.parse(createTableSQL);

        // Extract column definitions from CREATE TABLE statement
        const columnDefinitions =
          statements
            .find((s) => s.variant === 'createTable')
            ?.columns.filter((c) => c.variant === 'columnDefinition')
            .map((c) => {
              return {
                name: c.name,
                type: c.type,
                isNullable: !c.nullable,
                default: c.default || undefined,
                userDefined: false, // SQLite doesn't have user-defined types
                isGenerated: false, // SQLite doesn't support generated columns in the same way
              };
            }) ?? [];

        return columnDefinitions;
      });
  }

  async describeEnum(enumName: string) {
    return [];
  }

  async getPrimaryKeys(table: string, schema: string = 'main') {
    return this.db
      .selectFrom('sqlite_master')
      .select(['sql'])
      .where('name', '=', table)
      .where('type', '=', 'table')
      .execute()
      .then((rows) => {
        if (rows.length === 0) {
          return [];
        }

        const createTableSQL = rows[0].sql as string;
        const statements: SqliteParseResult = sqliteParser.parse(createTableSQL);

        // Extract primary key columns from CREATE TABLE statement
        const tableStatement = statements.find((s) => s.variant === 'createTable');
        if (!tableStatement) {
          return [];
        }

        // Look for columns with PRIMARY KEY constraint
        const primaryKeyColumns = tableStatement.columns
          .filter((c) => c.variant === 'columnDefinition' && c.isPrimaryKey)
          .map((c) => c.name);

        return primaryKeyColumns;
      });
  }
}
