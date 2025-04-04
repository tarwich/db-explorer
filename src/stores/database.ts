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

  // Sidebar state
  selectedRecord: Record<string, unknown> | null;
  isSidebarOpen: boolean;
  isSidebarPinned: boolean;
  pinnedRecords: Array<{
    record: Record<string, unknown>;
    tableId: string;
  }>;

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
  saveRecord: (updatedRecord: Record<string, unknown>) => Promise<void>;

  // Sidebar actions
  selectRecord: (record: Record<string, unknown> | null) => void;
  toggleSidebarPin: () => void;
  closeSidebar: () => void;
  addPinnedRecord: (record: Record<string, unknown>, tableId: string) => void;
  removePinnedRecord: (record: Record<string, unknown>) => void;
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

  // Initial sidebar state
  selectedRecord: null,
  isSidebarOpen: false,
  isSidebarPinned: false,
  pinnedRecords: [],

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

  saveRecord: async (updatedRecord: Record<string, unknown>) => {
    const { activeConnection, activeTable, tableData } = get();
    if (!activeConnection || !activeTable || !tableData) return;

    try {
      const result = await window.electronAPI.tables.updateRecord(
        activeConnection,
        activeTable.schema,
        activeTable.name,
        updatedRecord
      );

      if (result?.success) {
        // Optimistically update the record in the table
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
      } else {
        throw new Error(result?.error || 'Failed to update record');
      }
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

  closeSidebar: () => {
    const { isSidebarPinned, selectedRecord } = get();
    if (!isSidebarPinned) {
      set({
        selectedRecord: null,
        isSidebarOpen: false,
      });
    } else if (selectedRecord) {
      // If pinned, remove this record from pinned records
      get().removePinnedRecord(selectedRecord);
    }
  },

  addPinnedRecord: (record, tableId) => {
    set((state) => ({
      pinnedRecords: [...state.pinnedRecords, { record, tableId }],
    }));
  },

  removePinnedRecord: (recordToRemove) => {
    set((state) => ({
      pinnedRecords: state.pinnedRecords.filter(
        ({ record }) => record !== recordToRemove
      ),
    }));
  },
}));
