import { Kysely } from 'kysely';
import { SqliteParseResult } from '../parsers/sqlite/parser';
import * as sqliteParser from '../parsers/sqlite/parser.mjs';
import { IDatabasePlugin } from './plugin';

export const SqlitePlugin: IDatabasePlugin = {
  name: 'sqlite',
  listTables: listTables,
  describeTable: describeTable,
  describeEnum: describeEnum,
};

async function listTables(
  db: Kysely<any>,
  { schema = 'public' }: { schema?: string } = {}
) {
  return db
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

async function describeTable(db: Kysely<any>, table: string) {
  return db
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

      const statements: SqliteParseResult = sqliteParser.parse(createTableSQL);

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
            };
          }) ?? [];

      return columnDefinitions;
    });
}

async function describeEnum(db: Kysely<any>, enumName: string) {
  return [];
}
