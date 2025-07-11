import { getStateDb } from '@/db/state-db';

export async function deleteConnection(connectionId: string) {
  const stateDb = await getStateDb();
  await stateDb.deleteFrom('connections').where('id', '=', connectionId).execute();
}
