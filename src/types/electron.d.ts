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
  }[];
  rows?: Record<string, unknown>[];
  totalRows?: number;
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
      };
    };
  }
}
