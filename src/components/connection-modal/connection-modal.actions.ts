"use server";

import { getStateDb } from "@/db/state-db";
import { StateDatabase } from "@/types/connections";
import { randomUUID } from "node:crypto";

export async function loadConnection(connectionId: string) {
  if (!connectionId) {
    return null;
  }

  const stateDb = await getStateDb();
  const connection = await stateDb
    .selectFrom("connections")
    .where("id", "=", connectionId)
    .selectAll()
    .executeTakeFirst();

  if (connection && typeof connection.details === 'string') {
    connection.details = JSON.parse(connection.details);
  }

  return connection;
}

export async function saveConnection(
  connectionId: string | undefined,
  connection: StateDatabase["connections"]
): Promise<string> {
  const stateDb = await getStateDb();

  if (!connectionId) {
    const newId = randomUUID();
    await stateDb
      .insertInto('connections')
      .values({
        id: newId,
        name: connection.name,
        type: connection.type,
        details: JSON.stringify(connection.details) as any,
      })
      .execute();
    return newId;
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
    return connectionId;
  }
}
