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
    }[]
  >;

  describeEnum(enumName: string): Promise<string[]>;
}
