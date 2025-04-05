'use server';

import { getServerState } from '../state';

export async function boot() {
  const state = await getServerState();

  return state;
}
