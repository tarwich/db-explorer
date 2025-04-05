'use server';

import { DatabaseTable } from '@/stores/database';
import { DatabaseConnection } from '@/types/connections';
import { RecordEditor } from '@/types/record-editor';
import { readFile, writeFile } from 'fs/promises';

declare global {
  /** @deprecated use getServerState() instead */
  var state: ServerState | undefined;
}

export type ServerState = {
  // General data
  connections: DatabaseConnection[];
  tables: DatabaseTable[];

  // More transient data
  selectedConnectionId: string | null;
  selectedTableId: string | null;
  recordEditors: RecordEditor[];
};

export async function getServerState(): Promise<ServerState> {
  if (!globalThis.state) {
    Object.assign(globalThis, {
      state: {
        connections: [],
        tables: [],
        selectedConnectionId: null,
        selectedTableId: null,
        recordEditors: [],
      },
    });

    const state = globalThis.state!;

    async function loadState() {
      try {
        const json = await (async () => {
          try {
            const data = await readFile('.state.json', 'utf8');
            return JSON.parse(data);
          } catch (error) {
            // If the file doesn't exist, return empty state
            if (error instanceof Error && !error.message.includes('ENOENT')) {
              throw error;
            }

            return {
              connections: [],
              tables: [],
              recordEditors: [],
            };
          }
        })();

        state.connections = json.connections || [];
        state.tables = json.tables || [];
        state.recordEditors = json.recordEditors || [];
      } catch (error) {
        throw new Error('Failed to initialize application state');
      }
    }

    await loadState();
  }

  return globalThis.state!;
}

export async function saveState() {
  const state = await getServerState();

  const data = {
    connections: state.connections,
    tables: state.tables,
    recordEditors: state.recordEditors,
  };

  await writeFile('.state.json', JSON.stringify(data, null, 2));
}
