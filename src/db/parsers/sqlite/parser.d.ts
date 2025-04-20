export type SqliteParseResult = Statement[];

export type Statement =
  | { variant: 'createTable'; tableName: string; columns: ColumnDefinition[] }
  | { variant: 'comment'; value: string };

export type ColumnDefinition = {
  variant: 'columnDefinition';
  name: string;
  type: string;
  isPrimaryKey: boolean;
  nullable: boolean;
  default: string | null;
};

export type ConstraintColumn = {
  variant: 'constraint';
  name: string;
  primaryKey: boolean;
  columns: string[];
};
