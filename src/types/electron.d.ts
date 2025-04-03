import { DatabaseConnection } from './connections';

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
      };
    };
  }
}
