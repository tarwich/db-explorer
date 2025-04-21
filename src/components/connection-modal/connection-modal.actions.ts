'use server';

import { getStateDb } from '@/db/state-db';
import { StateDatabase } from '@/types/connections';
import { randomUUID } from 'node:crypto';

export async function loadConnection(connectionId: string) {
  if (!connectionId) {
    return null;
  }

  const stateDb = await getStateDb();
  const connection = await stateDb
    .selectFrom('connections')
    .where('id', '=', connectionId)
    .selectAll()
    .executeTakeFirst();

  return connection;
}

export async function saveConnection(
  connectionId: string | undefined,
  connection: StateDatabase['connections']
) {
  const stateDb = await getStateDb();

  if (!connectionId) {
    await stateDb
      .insertInto('connections')
      .values({
        id: randomUUID(),
        name: connection.name,
        type: connection.type,
        details: JSON.stringify(connection.details) as any,
      })
      .execute();
  } else {
    await stateDb
      .updateTable('connections')
      .set({
        name: connection.name,
        type: connection.type,
        details: JSON.stringify(connection.details) as any,
      })
      .where('id', '=', connectionId)
      .execute();
  }
}
