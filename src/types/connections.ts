import { JSONColumnType } from 'kysely';

export type StateDatabase = {
  connections: DatabaseConnection;
  tables: SerializedDatabaseTable;
};

export interface IPostgresConnectionDetails {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export const isPostgresConnection = (
  connection: DatabaseConnection
): connection is DatabaseConnection & {
  details: IPostgresConnectionDetails;
} => {
  return connection.type === 'postgres';
};

export interface ISqliteConnectionDetails {
  path: string;
}

export const isSqliteConnection = (
  connection: DatabaseConnection
): connection is DatabaseConnection & {
  details: ISqliteConnectionDetails;
} => {
  return connection.type === 'sqlite';
};

export interface DatabaseConnection {
  id?: string;
  name: string;
  type: 'postgres' | 'sqlite';
  details: Omit<
    JSONColumnType<IPostgresConnectionDetails | ISqliteConnectionDetails>,
    '__insert__' | '__update__' | '__select__'
  >;
}

export interface SerializedDatabaseTable {
  name: string;
  schema: string;
  connectionId: string;
  details: string;
}

export interface DeserializedTable {
  name: string;
  schema: string;
  connectionId: string;
  details: {
    normalizedName: string;
    displayColumns: string[];
    pk: string[];
    columns: {
      name: string;
      normalizedName: string;
      type: string;
      nullable: boolean;
      enumOptions?: string[];
      foreignKey?: {
        targetTable: string;
        targetColumn: string;
        isGuessed: boolean;
      };
    }[];
  };
}

export const serializeDatabaseTable = (table: DeserializedTable) => {
  return {
    ...table,
    details: JSON.stringify(table.details),
  };
};

export const deserializeDatabaseTable = (
  table: SerializedDatabaseTable
): DeserializedTable => {
  return {
    ...table,
    details: JSON.parse(table.details as any),
  };
};
