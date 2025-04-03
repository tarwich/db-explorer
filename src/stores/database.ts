import { create } from 'zustand';
import { DatabaseConnection } from '@/types/connections';

export interface Table {
  id: string;
  name: string;
  type: string;
  schema?: string;
}

interface DatabaseStore {
  // Connection state
  connections: DatabaseConnection[];
  activeConnection: DatabaseConnection | null;

  // Tables state
  tables: Table[];
  isLoadingTables: boolean;

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
}

export const useDatabaseStore = create<DatabaseStore>((set, get) => ({
  // Initial state
  connections: [],
  activeConnection: null,
  tables: [],
  isLoadingTables: false,

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
    set({ tables: [], activeConnection: connection });

    // Load tables for the new connection if one is selected
    if (connection) {
      await get().loadTables();
    }
  },

  // Table actions
  loadTables: async () => {
    const { activeConnection } = get();
    if (!activeConnection) return;

    set({ isLoadingTables: true });
    try {
      // TODO: Implement actual table loading from the database
      // This will need to be implemented based on your electron API
      // const tables = await window.electronAPI.tables.getAll(activeConnection.id);
      // set({ tables });

      // Temporary mock data
      set({
        tables: [
          { id: '1', name: 'users', type: 'table' },
          { id: '2', name: 'products', type: 'table' },
        ],
      });
    } catch (error) {
      console.error('Failed to load tables:', error);
      // You might want to set an error state here
    } finally {
      set({ isLoadingTables: false });
    }
  },

  clearTables: () => {
    set({ tables: [] });
  },
}));
