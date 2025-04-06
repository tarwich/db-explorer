import { DatabaseConnection } from '@/types/connections';
import { TableColumn } from '@/stores/database';
import { getServerState } from '../state';

// Helper to get the current connection from context
async function getCurrentConnection(): Promise<DatabaseConnection> {
  const state = await getServerState();
  if (!state.selectedConnectionId) {
    throw new Error('No connection selected');
  }
  const connection = state.connections.find(
    (c) => c.id === state.selectedConnectionId
  );
  if (!connection) {
    throw new Error('Selected connection not found');
  }
  return connection;
}

export async function getTables() {
  const connection = await getCurrentConnection();
  // ... rest of your getTables implementation using connection
}

export async function getTableData({
  schema,
  table,
  page,
  pageSize,
  filter,
}: {
  schema: string;
  table: string;
  page: number;
  pageSize: number;
  filter?: string;
}) {
  const connection = await getCurrentConnection();
  // ... rest of your getTableData implementation using connection
}

export async function updateRecord(
  schema: string,
  table: string,
  record: Record<string, unknown>
) {
  const connection = await getCurrentConnection();
  // ... rest of your updateRecord implementation using connection
}

// ... rest of your actions file
