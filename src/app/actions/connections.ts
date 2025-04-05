'use server';

import { DatabaseConnection } from '@/types/connections';
import { getServerState, saveState } from '../state';

export async function getConnections() {
  const state = await getServerState();
  return state.connections || [];
}

export async function saveConnection(connection: Partial<DatabaseConnection>) {
  console.log(connection);
  const sanitized = ((
    input: Partial<DatabaseConnection>
  ): DatabaseConnection => {
    return {
      name: '',
      type: 'postgres',
      host: '',
      port: 5432,
      database: '',
      username: '',
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...input,
      updatedAt: new Date().toISOString(),
    };
  })(connection);

  const state = await getServerState();
  console.log(state.connections);
  console.log(sanitized.id);
  const index = state.connections.findIndex((c) => c.id === sanitized.id);
  console.log(index);

  if (index === -1) {
    state.connections.push(sanitized);
  } else {
    state.connections[index] = sanitized;
  }

  // Persist the state after saving
  await saveState();

  return sanitized;
}

export async function deleteConnection(connectionId: string) {
  const state = await getServerState();
  state.connections = state.connections.filter((c) => c.id !== connectionId);
  await saveState();
}

export async function selectConnection(connectionId: string) {
  const state = await getServerState();
  state.selectedConnectionId = connectionId;
}

export async function getSelectedConnection() {
  const state = await getServerState();
  return (
    state.connections.find((c) => c.id === state.selectedConnectionId) || null
  );
}
