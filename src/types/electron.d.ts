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
      };
    };
  }
}
