'use server';

import { DatabaseConnection } from '@/types/connections';
import pg from 'pg';
import { z } from 'zod';

const connectionSchema = z.object({
  host: z.string(),
  port: z.number(),
  database: z.string(),
  username: z.string(),
  password: z.string().optional(),
});

export async function testConnection(
  connection: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>
) {
  try {
    const validatedConnection = connectionSchema.parse(connection);
    const client = new pg.Client({
      host: validatedConnection.host,
      port: validatedConnection.port,
      database: validatedConnection.database,
      user: validatedConnection.username,
      password: validatedConnection.password,
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request',
    };
  }
}
