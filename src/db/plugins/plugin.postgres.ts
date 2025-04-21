import { Kysely } from 'kysely';
import { IDatabasePlugin } from './plugin';

export class PostgresPlugin implements IDatabasePlugin {
  name = 'postgres';

  constructor(private readonly db: Kysely<any>) {}

  async listTables({ schema = 'public' }: { schema?: string } = {}) {
    return this.db
      .selectFrom('information_schema.tables')
      .select(['table_name', 'table_schema'])
      .where('table_schema', '=', schema)
      .execute()
      .then((rows) =>
        rows.map((row) => ({
          name: row.table_name,
          schema: row.table_schema,
        }))
      );
  }

  async describeTable(table: string) {
    return this.db
      .selectFrom('information_schema.columns')
      .select([
        'column_name',
        'data_type',
        'is_nullable',
        'column_default',
        'character_maximum_length',
        'udt_name',
      ])
      .where('table_name', '=', table)
      .orderBy('ordinal_position')
      .execute()
      .then((rows) =>
        rows.map((row) => {
          const userDefined = row.data_type === 'USER-DEFINED';

          return {
            name: row.column_name,
            type: userDefined ? 'enum' : row.udt_name,
            isNullable: row.is_nullable === 'YES',
            default: row.column_default,
            userDefined,
          };
        })
      );
  }

  async describeEnum(enumName: string) {
    const result = await this.db
      .selectFrom('pg_enum')
      .select('enumlabel as value')
      .innerJoin('pg_type', 'pg_type.oid', 'pg_enum.enumtypid')
      .where('pg_type.typname', '=', enumName)
      .execute()
      .then((rows) => rows.map((row) => row.value));

    return result;
  }
}
