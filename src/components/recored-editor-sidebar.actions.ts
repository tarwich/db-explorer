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

export async function getBacklinks({
  connectionId,
  tableName,
  recordId,
}: {
  connectionId: string;
  tableName: string;
  recordId: any;
}) {
  const db = await openConnection(connectionId);
  
  if (!db) {
    throw new Error('Database connection is null');
  }

  console.log('Getting backlinks for:', { connectionId, tableName, recordId });

  // For now, focus on the existing foreign key guessing system
  // since database constraint introspection is complex
  const { getTables } = await import('@/app/api/tables');
  const allTables = await getTables(connectionId);
  
  const guessingReferences = [];
  for (const table of allTables) {
    for (const [columnName, column] of Object.entries(table.details.columns)) {
      if (column.foreignKey && column.foreignKey.targetTable === tableName) {
        guessingReferences.push({
          sourceTable: table.name,
          sourceColumn: columnName,
          targetTable: tableName,
          targetColumn: column.foreignKey.targetColumn,
          isGuessed: column.foreignKey.isGuessed,
        });
      }
    }
  }

  console.log('Found guessed references:', guessingReferences);

  // For each reference, fetch the actual records that point to this record
  const backlinks = [];
  
  for (const ref of guessingReferences) {
    try {
      const records = await db
        .selectFrom(ref.sourceTable)
        .selectAll()
        .where(ref.sourceColumn, '=', recordId)
        .limit(10) // Limit to avoid too much data
        .execute();

      if (records.length > 0) {
        // Get table details for display
        const sourceTableInfo = allTables.find((t: any) => t.name === ref.sourceTable);
        
        backlinks.push({
          table: ref.sourceTable,
          column: ref.sourceColumn,
          count: records.length,
          records: records,
          tableInfo: sourceTableInfo,
          isGuessed: ref.isGuessed,
        });
      }
    } catch (error) {
      console.warn(`Error fetching backlinks from ${ref.sourceTable}.${ref.sourceColumn}:`, error);
    }
  }

  console.log('Final backlinks:', backlinks);
  return backlinks;
}
