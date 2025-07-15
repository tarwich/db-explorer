export interface IDatabasePlugin {
  name: string;

  listTables(options?: {
    schema?: string;
  }): Promise<{ name: string; schema: string }[]>;

  describeTable(table: string): Promise<
    {
      name: string;
      type: string;
      isNullable: boolean;
      default?: string;
      userDefined: boolean;
      isGenerated?: boolean;
    }[]
  >;

  describeEnum(enumName: string): Promise<string[]>;

  getPrimaryKeys(table: string, schema?: string): Promise<string[]>;

  getForeignKeyConstraints(table?: string, schema?: string): Promise<{
    constraintName: string;
    sourceTable: string;
    sourceColumn: string;
    targetTable: string;
    targetColumn: string;
    sourceSchema: string;
    targetSchema: string;
  }[]>;
}
