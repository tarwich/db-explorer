import { create } from 'zustand';
import { DatabaseConnection } from '@/types/connections';

export interface Table {
  id: string;
  name: string;
  schema: string;
  type: string;
  description?: string;
}

export interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
}

interface DatabaseStore {
  // Connection state
  connections: DatabaseConnection[];
  activeConnection: DatabaseConnection | null;

  // Tables state
  tables: Table[];
  isLoadingTables: boolean;
  activeTable: Table | null;
  tableData: {
    columns: TableColumn[];
    rows: Record<string, unknown>[];
    totalRows: number;
    currentPage: number;
    pageSize: number;
  } | null;
  isLoadingTableData: boolean;

  // Connection actions
  loadConnections: () => Promise<void>;
  addConnection: (
    connection: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateConnection: (
    id: string,
    connection: DatabaseConnection
  ) => Promise<void>;
  setActiveConnection: (connection: DatabaseConnection | null) => Promise<void>;

  // Table actions
  loadTables: () => Promise<void>;
  clearTables: () => void;
  setActiveTable: (table: Table | null) => void;
  loadTableData: (page?: number, pageSize?: number) => Promise<void>;
}

export const useDatabaseStore = create<DatabaseStore>((set, get) => ({
  // Initial state
  connections: [],
  activeConnection: null,
  tables: [],
  isLoadingTables: false,
  activeTable: null,
  tableData: null,
  isLoadingTableData: false,

  // Connection actions
  loadConnections: async () => {
    const connections = await window.electronAPI?.connections.getAll();
    set({ connections: connections || [] });
  },

  addConnection: async (connectionData) => {
    const newConnection: DatabaseConnection = {
      ...connectionData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await window.electronAPI.connections.add(newConnection);
    await get().loadConnections();
  },

  updateConnection: async (id, connection) => {
    await window.electronAPI.connections.update(id, connection);
    await get().loadConnections();
  },

  setActiveConnection: async (connection) => {
    // Clear existing table data when changing connections
    set({
      tables: [],
      activeConnection: connection,
      activeTable: null,
      tableData: null,
    });

    // Load tables for the new connection if one is selected
    if (connection) {
      await get().loadTables();
    }
  },

  // Table actions
  loadTables: async () => {
    const { activeConnection } = get();
    if (!activeConnection) return;

    if (!window.electronAPI?.tables?.getAll) {
      console.error('Tables API not available');
      return;
    }

    set({ isLoadingTables: true });

    try {
      const result = await window.electronAPI.tables.getAll(activeConnection);

      if (result?.success && Array.isArray(result.tables)) {
        const tables = result.tables.map((table) => ({
          id: `${table.schema}.${table.name}`,
          name: table.name,
          schema: table.schema,
          type:
            table.type === 'BASE TABLE' ? 'table' : table.type.toLowerCase(),
          description: table.description || undefined,
        }));
        set({ tables });
      } else {
        console.error(
          'Failed to load tables:',
          result?.error || 'Unknown error'
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
    const { activeConnection, activeTable } = get();
    if (!activeConnection || !activeTable) return;

    set({ isLoadingTableData: true });

    try {
      const result = await window.electronAPI.tables.getData(
        activeConnection,
        activeTable.schema,
        activeTable.name,
        page,
        pageSize
      );

      if (
        result?.success &&
        result.columns &&
        result.rows &&
        result.totalRows !== undefined
      ) {
        set({
          tableData: {
            columns: result.columns,
            rows: result.rows,
            totalRows: result.totalRows,
            currentPage: page,
            pageSize: pageSize,
          },
        });
      } else {
        console.error(
          'Failed to load table data:',
          result?.error || 'Unknown error'
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
}));
