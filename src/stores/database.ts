import {
  getTableData,
  getTables,
  testConnection,
  updateRecord,
} from '@/app/actions';
import { DatabaseConnection } from '@/types/connections';
import { normalizeName } from '@/utils/normalize-name';
import { create } from 'zustand';

export interface DatabaseTable {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
}

export interface ForeignKeyInfo {
  columnName: string;
  targetSchema: string;
  targetTable: string;
  targetColumn: string;
  displayColumns?: string[];
  isGuessed?: boolean;
  confidence?: number;
}

export interface TableColumn {
  column_name: string;
  normalizedName: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  foreignKey?: ForeignKeyInfo;
}

interface TableData {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  totalRows: number;
  currentPage: number;
  pageSize: number;
  primaryKey?: string[];
  foreignKeys?: {
    columnName: string;
    targetSchema: string;
    targetTable: string;
    targetColumn: string;
    isGuessed?: boolean;
    confidence?: number;
  }[];
}

interface PinnedRecord {
  tableId: string;
  record: Record<string, unknown>;
}

interface DatabaseStore {
  // State
  connections: DatabaseConnection[];
  tables: DatabaseTable[];
  isLoadingTables: boolean;
  activeTable: DatabaseTable | null;
  tableData: TableData | null;
  isLoadingTableData: boolean;
  selectedRecord: Record<string, unknown> | null;
  isSidebarOpen: boolean;
  isSidebarPinned: boolean;
  pinnedRecords: PinnedRecord[];

  // Actions
  loadConnections: () => Promise<void>;
  addConnection: (
    connection: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateConnection: (
    id: string,
    connection: Partial<DatabaseConnection>
  ) => Promise<void>;
  loadTables: () => Promise<void>;
  clearTables: () => void;
  setActiveTable: (table: DatabaseTable | null) => void;
  loadTableData: (page?: number, pageSize?: number) => Promise<void>;
  saveRecord: (record: Record<string, unknown>) => Promise<void>;
  selectRecord: (record: Record<string, unknown> | null) => void;
  toggleSidebarPin: () => void;
  addPinnedRecord: (record: Record<string, unknown>, tableId: string) => void;
  removePinnedRecord: (record: Record<string, unknown>) => void;
  closeSidebar: () => void;
  updateTable: (id: string, table: Partial<DatabaseTable>) => void;
}

export const useDatabaseStore = create<DatabaseStore>((set, get) => ({
  // Initial state
  connections: [],
  tables: [],
  isLoadingTables: false,
  activeTable: null,
  tableData: null,
  isLoadingTableData: false,
  selectedRecord: null,
  isSidebarOpen: false,
  isSidebarPinned: false,
  pinnedRecords: [],

  // Connection actions
  loadConnections: async () => {
    // For now, we'll keep connections in localStorage
    const stored = localStorage.getItem('connections');
    set({ connections: stored ? JSON.parse(stored) : [] });
  },

  addConnection: async (connectionData) => {
    // Test the connection before adding
    const result = await testConnection(connectionData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to connect to database');
    }

    const newConnection: DatabaseConnection = {
      ...connectionData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const connections = [...get().connections, newConnection];
    localStorage.setItem('connections', JSON.stringify(connections));
    set({ connections });
  },

  updateConnection: async (id, connection) => {
    // Test the connection before updating if connection details changed
    const existingConnection = get().connections.find((c) => c.id === id);
    if (
      existingConnection &&
      (connection.host !== existingConnection.host ||
        connection.port !== existingConnection.port ||
        connection.database !== existingConnection.database ||
        connection.username !== existingConnection.username ||
        connection.password !== existingConnection.password)
    ) {
      const result = await testConnection({
        ...existingConnection,
        ...connection,
      });
      if (!result.success) {
        throw new Error(result.error || 'Failed to connect to database');
      }
    }

    const connections = get().connections.map((c) =>
      c.id === id
        ? {
            ...c,
            ...connection,
            updatedAt: new Date().toISOString(),
          }
        : c
    );
    localStorage.setItem('connections', JSON.stringify(connections));
    set({ connections });
  },

  // Table actions
  loadTables: async () => {
    set({ isLoadingTables: true });

    try {
      const result = await getTables();

      if (result.success && Array.isArray(result.tables)) {
        const tables = result.tables.map((table) => ({
          id: `${table.schema}.${table.name}`,
          name: table.name,
          normalizedName: normalizeName(table.name),
          schema: table.schema,
          type: table.type.toLowerCase(),
          description: table.description || undefined,
          primaryKey: table.primaryKey,
          columns: table.columns,
          displayColumns: table.displayColumns,
          foreignKeys: table.foreignKeys,
        }));
        set({ tables });
      } else {
        console.error(
          'Failed to load tables:',
          result.error || 'Unknown error'
        );
        set({ tables: [] });
      }
    } catch (error) {
      console.error('Error loading tables:', error);
      set({ tables: [] });
    } finally {
      set({ isLoadingTables: false });
    }
  },

  clearTables: () => {
    set({ tables: [] });
  },

  setActiveTable: (table) => {
    set({ activeTable: table, tableData: null });
    if (table) {
      get().loadTableData(1, 50);
    }
  },

  loadTableData: async (page = 1, pageSize = 50) => {
    const { activeTable } = get();
    if (!activeTable) return;

    set({ isLoadingTableData: true });

    try {
      const result = await getTableData({
        schema: activeTable.schema,
        table: activeTable.name,
        page,
        pageSize,
      });

      if (
        result.success &&
        result.columns &&
        result.rows &&
        result.totalRows !== undefined
      ) {
        // Update the table data
        set({
          tableData: {
            columns: result.columns,
            rows: result.rows,
            totalRows: result.totalRows,
            currentPage: page,
            pageSize: pageSize,
            primaryKey: result.primaryKey,
            foreignKeys: result.foreignKeys,
          },
        });

        // Also update the active table with the latest properties
        const updatedTable = {
          ...activeTable,
          primaryKey: result.primaryKey,
          foreignKeys: result.foreignKeys,
          columns: result.columns,
        };

        // Update both the active table and the tables list
        set((state) => ({
          activeTable: updatedTable,
          tables: state.tables.map((t) =>
            t.id === activeTable.id ? updatedTable : t
          ),
        }));
      } else {
        console.error(
          'Failed to load table data:',
          result.error || 'Unknown error'
        );
        set({ tableData: null });
      }
    } catch (error) {
      console.error('Error loading table data:', error);
      set({ tableData: null });
    } finally {
      set({ isLoadingTableData: false });
    }
  },

  saveRecord: async (updatedRecord: Record<string, unknown>) => {
    const { activeTable, tableData } = get();
    if (!activeTable || !tableData) return;

    try {
      // Call the server action to update the record
      const result = await updateRecord(
        activeTable.schema,
        activeTable.name,
        updatedRecord
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to update record');
      }

      // Update the UI state after successful database update
      set((state) => ({
        tableData: state.tableData
          ? {
              ...state.tableData,
              rows: state.tableData.rows.map((row) =>
                row === get().selectedRecord ? updatedRecord : row
              ),
            }
          : null,
      }));

      // Update the selected record
      set((state) => ({
        selectedRecord: updatedRecord,
        pinnedRecords: state.pinnedRecords.map((pinned) =>
          pinned.record === get().selectedRecord
            ? { ...pinned, record: updatedRecord }
            : pinned
        ),
      }));
    } catch (error) {
      console.error('Error updating record:', error);
      throw error;
    }
  },

  // Sidebar actions
  selectRecord: (record) => {
    const { isSidebarPinned } = get();
    if (!isSidebarPinned) {
      set({
        selectedRecord: record,
        isSidebarOpen: !!record,
      });
    }
  },

  toggleSidebarPin: () => {
    const { isSidebarPinned, selectedRecord, activeTable } = get();
    set({ isSidebarPinned: !isSidebarPinned });

    // If pinning and there's a selected record, add it to pinned records
    if (!isSidebarPinned && selectedRecord && activeTable) {
      get().addPinnedRecord(selectedRecord, activeTable.id);
    }
  },

  addPinnedRecord: (record, tableId) => {
    set((state) => ({
      pinnedRecords: [...state.pinnedRecords, { tableId, record }],
    }));
  },

  removePinnedRecord: (record) => {
    set((state) => ({
      pinnedRecords: state.pinnedRecords.filter(
        (pinned) => pinned.record !== record
      ),
    }));
  },

  closeSidebar: () => {
    set({ isSidebarOpen: false });
  },

  updateTable: (id: string, table: Partial<DatabaseTable>) => {
    const tables = get().tables.map((t) =>
      t.id === id ? { ...t, ...table } : t
    );
    set({ tables });

    // Update activeTable if it's the one being modified
    const activeTable = get().activeTable;
    if (activeTable?.id === id) {
      set({ activeTable: { ...activeTable, ...table } });
    }
  },
}));
