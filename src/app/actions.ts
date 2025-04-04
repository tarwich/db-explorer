'use server';

import { DatabaseConnection } from '@/types/connections';
import { z } from 'zod';
import pg from 'pg';

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

export async function getTables(connection: DatabaseConnection) {
  try {
    const validatedConnection = connectionSchema.parse(connection);
    const client = new pg.Client({
      host: validatedConnection.host,
      port: validatedConnection.port,
      database: validatedConnection.database,
      user: validatedConnection.username,
      password: validatedConnection.password,
    });

    try {
      await client.connect();
      const result = await client.query(`
        SELECT
          t.table_schema as schema,
          t.table_name as name,
          t.table_type as type,
          obj_description(
            (quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass::oid,
            'pg_class'
          ) as description
        FROM information_schema.tables t
        WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY t.table_schema, t.table_name
      `);

      await client.end();
      return {
        success: true,
        tables: result.rows,
      };
    } catch (error) {
      await client.end().catch(() => {});
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

export async function getTableData(
  connection: DatabaseConnection,
  schema: string,
  table: string,
  page: number = 1,
  pageSize: number = 50
) {
  try {
    const validatedConnection = connectionSchema.parse(connection);
    const client = new pg.Client({
      host: validatedConnection.host,
      port: validatedConnection.port,
      database: validatedConnection.database,
      user: validatedConnection.username,
      password: validatedConnection.password,
    });

    try {
      await client.connect();

      // Get column information
      const columnsResult = await client.query(
        `
        SELECT
          column_name,
          data_type,
          is_nullable,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
        `,
        [schema, table]
      );

      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM ${client.escapeIdentifier(
          schema
        )}.${client.escapeIdentifier(table)}`
      );

      // Get paginated data
      const offset = (page - 1) * pageSize;
      const dataResult = await client.query(
        `
        SELECT *
        FROM ${client.escapeIdentifier(schema)}.${client.escapeIdentifier(
          table
        )}
        LIMIT $1
        OFFSET $2
        `,
        [pageSize, offset]
      );

      await client.end();
      return {
        success: true,
        columns: columnsResult.rows,
        rows: dataResult.rows,
        totalRows: parseInt(countResult.rows[0].total),
      };
    } catch (error) {
      await client.end().catch(() => {});
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

export async function updateRecord(
  connection: DatabaseConnection,
  schema: string,
  table: string,
  record: Record<string, unknown>
): Promise<{
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}> {
  try {
    const validatedConnection = connectionSchema.parse(connection);
    const client = new pg.Client({
      host: validatedConnection.host,
      port: validatedConnection.port,
      database: validatedConnection.database,
      user: validatedConnection.username,
      password: validatedConnection.password,
    });

    try {
      await client.connect();

      // Build the UPDATE query dynamically
      const setClause = Object.entries(record)
        .filter(([key]) => key !== 'id') // Exclude id from SET clause
        .map(
          ([key], index) => `${client.escapeIdentifier(key)} = $${index + 2}`
        )
        .join(', ');

      const values = [
        record.id,
        ...Object.entries(record)
          .filter(([key]) => key !== 'id')
          .map(([, value]) => value),
      ];

      const query = `
        UPDATE ${client.escapeIdentifier(schema)}.${client.escapeIdentifier(
        table
      )}
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(query, values);
      await client.end();

      return {
        success: true,
        data: result.rows[0],
      };
    } catch (error) {
      await client.end().catch(() => {});
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
