'use server';

import { openConnection } from '@/app/api/connections';
import { getStateDb } from '@/db/state-db';
// import { deserializeDatabaseTable } from '@/types/connections';

export async function getTableInfo({
  connectionId,
  tableName,
}: {
  connectionId: string;
  tableName: string;
}) {
  const stateDb = await getStateDb();
  const serializedTableInfo = await stateDb
    .selectFrom('tables')
    .where('connectionId', '=', connectionId)
    .where('name', '=', tableName)
    .selectAll()
    .executeTakeFirst();

  if (!serializedTableInfo) {
    throw new Error('Table not found');
  }

  // Parse the details if it's a string
  if (serializedTableInfo.details && typeof serializedTableInfo.details === 'string') {
    serializedTableInfo.details = JSON.parse(serializedTableInfo.details);
  }

  return serializedTableInfo;
}

export async function getRecord({
  connectionId,
  tableName,
  pk,
}: {
  connectionId: string;
  tableName: string;
  pk: any;
}) {
  console.log('getRecord called with:', { connectionId, tableName, pk });
  
  const db = await openConnection(connectionId);
  console.log('Database connection:', !!db);
  
  // Use getTable instead of getTableInfo to get fresh data with primary keys
  const { getTable } = await import('@/app/api/tables');
  const tableInfo = await getTable(connectionId, tableName);
  console.log('Table info:', tableInfo);
  
  const pkField = tableInfo.details.pk[0];
  console.log('Primary key field:', pkField);

  if (!db) {
    throw new Error('Database connection is null');
  }

  if (!pkField) {
    throw new Error('Primary key field not found');
  }

  const record = await db
    .selectFrom(tableName)
    .where(pkField, '=', pk)
    .selectAll()
    .executeTakeFirst();

  console.log('Record found:', !!record);
  return record;
}

export async function updateRecord({
  connectionId,
  tableName,
  pk,
  record,
}: {
  connectionId: string;
  tableName: string;
  pk: any;
  record: any;
}) {
  const db = await openConnection(connectionId);
  const { getTable } = await import('@/app/api/tables');
  const tableInfo = await getTable(connectionId, tableName);
  const pkField = tableInfo.details.pk[0];

  // Known generated/computed columns that should be excluded from updates
  const knownGeneratedColumns = new Set(['searchText', 'searchtext', 'search_text']);

  // Filter out generated/computed columns and primary key fields
  const updatableRecord: any = {};
  for (const [key, value] of Object.entries(record)) {
    // Skip if it's a primary key field
    if (tableInfo.details.pk.includes(key)) {
      continue;
    }
    
    // Skip if it's a known generated column
    if (knownGeneratedColumns.has(key)) {
      continue;
    }
    
    // Skip if column metadata indicates it's generated
    const column = tableInfo.details.columns[key];
    if (column?.isGenerated) {
      continue;
    }
    
    updatableRecord[key] = value;
  }

  // Validate and parse JSON fields
  for (const [key, value] of Object.entries(updatableRecord)) {
    const column = tableInfo.details.columns[key];
    console.log(`Checking field ${key}: type=${column?.type}, value=${JSON.stringify(value)}`);
    if (column && (column.type === 'json' || column.type === 'jsonb')) {
      if (typeof value === 'string') {
        try {
          // Try to parse the JSON to validate it
          JSON.parse(value);
        } catch (error) {
          console.log(`Invalid JSON in field ${key}:`, value);
          // If JSON is invalid, remove it from the update
          delete updatableRecord[key];
        }
      } else if (value !== null && value !== undefined) {
        // Convert non-string values to JSON strings
        console.log(`Converting ${key} to JSON string:`, value);
        try {
          updatableRecord[key] = JSON.stringify(value);
        } catch (error) {
          console.log(`Failed to stringify ${key}:`, error);
          delete updatableRecord[key];
        }
      }
    }
  }

  console.log('Skipped generated columns:', Array.from(knownGeneratedColumns).filter(col => record.hasOwnProperty(col)));
  console.log('Fields being updated:', Object.keys(updatableRecord));

  const updatedRecord = await db
    .updateTable(tableName)
    .set(updatableRecord)
    .where(pkField, '=', pk)
    .returningAll()
    .executeTakeFirst();

  return updatedRecord;
}

export async function deleteRecord({
  connectionId,
  tableName,
  pk,
}: {
  connectionId: string;
  tableName: string;
  pk: any;
}) {
  const db = await openConnection(connectionId);
  const { getTable } = await import('@/app/api/tables');
  const tableInfo = await getTable(connectionId, tableName);
  const pkField = tableInfo.details.pk[0];

  await db.deleteFrom(tableName).where(pkField, '=', pk).execute();
}
