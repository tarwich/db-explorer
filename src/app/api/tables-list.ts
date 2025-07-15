'use server';

import { openConnection } from '@/app/api/connections';
import { loadConnection } from '@/components/connection-modal/connection-modal.actions';
import { getPlugin } from '@/db/plugins';
import { getStateDb } from '@/db/state-db';
import { objectify } from 'radash';
import logger from '../../lib/logger';

interface TableListItem {
  name: string;
  displayName: string;
  icon: string;
  isAnalyzed: boolean;
  recordCount: number | null;
}

/**
 * Fast table listing - returns just table names and basic info
 * No icon assignment, FK resolution, or heavy processing
 */
export async function getTablesList(connectionId: string): Promise<TableListItem[]> {
  try {
    const stateDb = await getStateDb();

    // Get known tables from state for any cached display names
    const knownTables = await stateDb
      .selectFrom('tables')
      .selectAll()
      .where('connectionId', '=', connectionId)
      .execute();

    const knownTablesMap = objectify(knownTables, (k) => k.name);

    // Use plugin to get raw table list (fast operation)
    const connection = await loadConnection(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const dbPlugin = await getPlugin(connection);
    const rawTables = await dbPlugin.listTables();

    // Return minimal table info for fast initial load
    const tables: TableListItem[] = rawTables.map((tableInfo) => {
      const tableName = typeof tableInfo === 'string' ? tableInfo : tableInfo.name;
      const knownTable = knownTablesMap[tableName];
      
      return {
        name: tableName,
        displayName: knownTable?.details?.pluralName || tableName,
        icon: knownTable?.details?.icon || 'Table', // Default icon, no expensive lookup
        isAnalyzed: !!knownTable, // Whether we have detailed analysis
        recordCount: null, // Will be loaded later
      };
    });

    return tables.sort((a, b) => a.displayName.localeCompare(b.displayName));

  } catch (error) {
    logger.error('Failed to get tables list:', error);
    throw new Error('Failed to get tables list');
  }
}

interface TableAnalysisResult {
  name: string;
  analyzed: boolean;
  icon?: string;
  columnCount?: number;
  error?: string;
}

/**
 * Analyze a specific table in the background
 * This does the heavy lifting: icon assignment, FK detection, etc.
 */
export async function analyzeTable(connectionId: string, tableName: string): Promise<TableAnalysisResult> {
  try {
    // Import the full table analysis logic
    const { getTable, saveTable } = await import('./tables');
    
    // This will do the heavy processing and cache results in state DB
    const tableDetails = await getTable(connectionId, tableName);
    
    // Save the updated table details (including newly detected primary keys) to state DB
    await saveTable(tableDetails);
    
    return {
      name: tableName,
      analyzed: true,
      icon: tableDetails.details.icon,
      columnCount: Object.keys(tableDetails.details.columns).length,
    };
  } catch (error) {
    logger.error(`Failed to analyze table ${tableName}:`, error);
    return {
      name: tableName,
      analyzed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}