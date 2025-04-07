export type StateDatabase = {
  connections: DatabaseConnection;
  tables: SerializedDatabaseTable;
};

export interface DatabaseConnection {
  id?: string;
  name: string;
  type: 'postgres';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
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
