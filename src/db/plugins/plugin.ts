import { Kysely } from 'kysely';

export interface IDatabasePlugin {
  name: string;

  listTables(
    db: Kysely<any>,
    options?: { schema?: string }
  ): Promise<{ name: string; schema: string }[]>;

  describeTable(
    db: Kysely<any>,
    table: string
  ): Promise<
    {
      name: string;
      type: string;
      isNullable: boolean;
      default?: string;
      userDefined: boolean;
    }[]
  >;

  describeEnum(db: Kysely<any>, enumName: string): Promise<string[]>;
}
