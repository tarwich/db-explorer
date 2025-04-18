import { Kysely } from 'kysely';
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
    .select(['name', 'type', 'sql'])
    .where('name', '=', table)
    .execute()
    .then((rows) =>
      rows.map((row) => ({
        name: row.name,
        type: row.type,
        isNullable: row.sql.includes('NULL'),
        default: row.sql.includes('DEFAULT'),
        userDefined: row.sql.includes('USER-DEFINED'),
      }))
    );
}

async function describeEnum(db: Kysely<any>, enumName: string) {
  return [];
}
