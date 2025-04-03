export interface DatabaseConnection {
  id: string;
  name: string;
  type: 'mysql' | 'postgres' | 'sqlite' | 'mongodb';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  connectionString?: string;
  options?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ConnectionsList = DatabaseConnection[];
