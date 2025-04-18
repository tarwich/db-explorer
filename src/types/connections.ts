import { TColorName } from '@/components/explorer/item-views/item-colors';
import { TIconName } from '@/components/explorer/item-views/item-icon';
import { JSONColumnType } from 'kysely';

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
  details: ExcludeHiddenColumns<
    JSONColumnType<IPostgresConnectionDetails | ISqliteConnectionDetails>
  >;
}

export type DatabaseTable = {
  name: string;
  schema: string;
  connectionId: string;
  details: ExcludeHiddenColumns<{
    normalizedName: string;
    singularName: string;
    pluralName: string;
    color: TColorName;
    icon: TIconName;
    displayColumns: string[];
    pk: string[];
    columns: {
      name: string;
      normalizedName: string;
      icon: TIconName;
      displayName: string;
      type: string;
      nullable: boolean;
      hidden: boolean;
      enumOptions?: string[];
      foreignKey?: {
        targetTable: string;
        targetColumn: string;
        isGuessed: boolean;
      };
    }[];
  }>;
};
