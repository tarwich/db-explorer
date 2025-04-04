import { DatabaseConnection } from './connections';

interface DatabaseTable {
  schema: string;
  name: string;
  type: string;
  description: string | null;
}

interface TablesResponse {
  success: boolean;
  error?: string;
  tables?: DatabaseTable[];
}

interface TableDataResponse {
  success: boolean;
  error?: string;
  columns?: {
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
    character_maximum_length: number | null;
    numeric_precision: number | null;
    numeric_scale: number | null;
    foreign_table_schema: string | null;
    foreign_table_name: string | null;
    foreign_column_name: string | null;
  }[];
  primaryKey?: string[];
  foreignKeys?: {
    columnName: string;
    targetSchema: string;
    targetTable: string;
    targetColumn: string;
    isGuessed?: boolean;
    confidence?: number;
  }[];
  rows?: Record<string, unknown>[];
  totalRows?: number;
}

interface UpdateRecordResponse {
  success: boolean;
  error?: string;
}

declare global {
  interface Window {
    electronAPI: {
      connections: {
        getAll: () => Promise<DatabaseConnection[]>;
        add: (
          connection: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>
        ) => Promise<boolean>;
        update: (
          id: string,
          connection: Partial<DatabaseConnection>
        ) => Promise<boolean>;
        delete: (id: string) => Promise<boolean>;
        test: (
          connection: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>
        ) => Promise<{ success: boolean; error?: string }>;
      };
      tables: {
        getAll: (connection: DatabaseConnection) => Promise<TablesResponse>;
        getData: (
          connection: DatabaseConnection,
          schema: string,
          table: string,
          page: number,
          pageSize: number
        ) => Promise<TableDataResponse>;
        updateRecord: (
          connection: DatabaseConnection,
          schema: string,
          table: string,
          record: Record<string, unknown>
        ) => Promise<UpdateRecordResponse>;
      };
    };
  }
}
