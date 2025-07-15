import { TColorName } from '@/components/explorer/item-views/item-colors';
import { TIconName } from '@/components/explorer/item-views/item-icon';

type ExcludeHiddenColumns<T> = Omit<
  T,
  '__insert__' | '__update__' | '__select__'
>;

export type StateDatabase = {
  connections: DatabaseConnection;
  tables: DatabaseTable;
};

export type SslMode = 'disable' | 'require' | 'verify-full' | 'verify-ca';

export interface IPostgresConnectionDetails {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslMode?: SslMode;
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
  details: IPostgresConnectionDetails | ISqliteConnectionDetails;
}

export type ColumnInformation = {
  name: string;
  normalizedName: string;
  icon: TIconName;
  displayName: string;
  type: string;
  nullable: boolean;
  hidden: boolean;
  order: number;
  enumOptions?: string[];
  isGenerated?: boolean;
  foreignKey?: {
    targetTable: string;
    targetColumn: string;
    isGuessed: boolean;
  };
};
export type ColumnDictionary = Record<string, ColumnInformation>;

export type CalculatedColumn = {
  id: string;
  name: string;
  displayName: string;
  template: string; // e.g., "{First} {Last}" or "{first_name} {last_name}"
  icon: TIconName;
  order: number;
  hidden: boolean;
};

export type LiteColumnInformation = { order: number; hidden: boolean };
export type LiteColumnDictionary = Record<string, LiteColumnInformation>;

export interface DatabaseTable {
  id?: string;
  name: string;
  schema: string;
  connectionId: string;
  details: {
    normalizedName: string;
    singularName: string;
    pluralName: string;
    color: TColorName;
    icon: TIconName;
    pk: string[];
    columns: ColumnDictionary;
    calculatedColumns?: CalculatedColumn[];
    inlineView: {
      columns: LiteColumnDictionary;
    };
    cardView: {
      columns: LiteColumnDictionary;
    };
    listView: {
      columns: LiteColumnDictionary;
    };
  };
}

export function storeJson<T>(value: T): T {
  return JSON.stringify(value) as any;
}
