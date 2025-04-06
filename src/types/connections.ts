export interface DatabaseConnection {
  id: string;
  name: string;
  type: 'postgres';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  connectionString?: string;
  options?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  tables: DatabaseTable[];
  getTables(): Promise<DatabaseTable[]>;
}

export type ConnectionsList = DatabaseConnection[];

export interface DatabaseTable {
  id: string;
  schema: string;
  name: string;
  type: string;
  description: string | null;
}
