'use server';

import { getTable, getTables, saveTable } from '@/app/api/tables';
import { getTablesList } from '@/app/api/tables-list';
import { getBestIcon, getBestIconForType } from '@/utils/best-icon';
import { guessForeignKeys } from '@/utils/foreign-key-guesser';
import { normalizeName } from '@/utils/normalize-name';
import { plural, singular } from 'pluralize';
import { title } from 'radash';

// Use optimized version for better performance
export async function autoAssignTableSettings({
  connectionId,
  tableName,
}: {
  connectionId: string;
  tableName: string;
}) {
  try {
    const table = await getTable(connectionId, tableName);
    const allTables = await getTables(connectionId);
    
    // Auto-assign table-level settings
    const normalizedTableName = normalizeName(tableName);
    const singularName = title(singular(normalizedTableName));
    const pluralName = title(plural(normalizedTableName));
    
    // Batch process all icon assignments in parallel for better performance
    const columnArray = Object.values(table.details.columns);
    
    // Create batched promises for icon assignments
    const tableIconPromise = getBestIcon(normalizedTableName);
    const columnIconPromises = columnArray.map(async (column) => ({
      name: column.name,
      icon: await getBestIconForType(column.type),
      displayName: title(normalizeName(column.name)),
    }));
    
    // Wait for all icon assignments to complete in parallel
    const [tableIcon, ...columnIconResults] = await Promise.all([
      tableIconPromise,
      ...columnIconPromises,
    ]);
    
    // Guess foreign keys
    const foreignKeyGuesses = guessForeignKeys(columnArray, allTables);
    
    // Build updated columns with results
    const updatedColumns = { ...table.details.columns };
    
    for (let i = 0; i < columnArray.length; i++) {
      const column = columnArray[i];
      const iconResult = columnIconResults[i];
      
      // Find foreign key guess for this column
      const fkGuess = foreignKeyGuesses.find(
        (guess) => guess.sourceColumn === column.name && guess.confidence > 0
      );
      
      updatedColumns[column.name] = {
        ...column,
        displayName: iconResult.displayName,
        icon: iconResult.icon,
        foreignKey: fkGuess
          ? {
              targetTable: fkGuess.targetTable,
              targetColumn: fkGuess.targetColumn,
              isGuessed: true,
            }
          : column.foreignKey,
      };
    }
    
    // Auto-configure view columns (show first 3-4 most relevant columns)
    const visibleColumns = columnArray
      .filter((col) => {
        // Prioritize name, title, description fields and non-ID fields
        const normalized = col.normalizedName;
        return (
          normalized.includes('name') ||
          normalized.includes('title') ||
          normalized.includes('description') ||
          (!normalized.endsWith('id') && !['uuid', 'json', 'jsonb'].includes(col.type))
        );
      })
      .slice(0, 4);
    
    const defaultViewColumns = Object.fromEntries(
      columnArray.map((col, index) => [
        col.name,
        {
          order: index,
          hidden: !visibleColumns.includes(col),
        },
      ])
    );
    
    // Create updated table object
    const updatedTable = {
      ...table,
      details: {
        ...table.details,
        icon: tableIcon,
        singularName,
        pluralName,
        columns: updatedColumns,
        inlineView: {
          ...table.details.inlineView,
          columns: { ...defaultViewColumns },
        },
        cardView: {
          ...table.details.cardView,
          columns: { ...defaultViewColumns },
        },
        listView: {
          ...table.details.listView,
          columns: { ...defaultViewColumns },
        },
      },
    };
    
    // Save the updated table
    await saveTable(updatedTable);
    
    return { success: true, message: 'Auto-assignment completed successfully' };
  } catch (error) {
    console.error('Error in auto-assign:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to auto-assign settings' 
    };
  }
}

/**
 * Auto-assign settings for all tables in a database
 */
export async function autoAssignAllTables({
  connectionId,
}: {
  connectionId: string;
}) {
  try {
    // Get list of all tables (fast operation)
    const tablesList = await getTablesList(connectionId);
    const totalTables = tablesList.length;
    
    let completedTables = 0;
    const results: Array<{ tableName: string; success: boolean; error?: string }> = [];
    
    // Process tables in batches to avoid overwhelming the system
    const BATCH_SIZE = 3; // Process 3 tables concurrently
    
    for (let i = 0; i < tablesList.length; i += BATCH_SIZE) {
      const batch = tablesList.slice(i, i + BATCH_SIZE);
      
      // Process current batch in parallel
      const batchPromises = batch.map(async (tableInfo) => {
        try {
          const result = await autoAssignTableSettings({
            connectionId,
            tableName: tableInfo.name,
          });
          
          completedTables++;
          
          return {
            tableName: tableInfo.name,
            success: result.success,
            error: result.success ? undefined : result.message,
          };
        } catch (error) {
          completedTables++;
          
          return {
            tableName: tableInfo.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to prevent overwhelming the system
      if (i + BATCH_SIZE < tablesList.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const successfulTables = results.filter(r => r.success).length;
    const failedTables = results.filter(r => !r.success);
    
    return {
      success: true,
      message: `Auto-assignment completed: ${successfulTables}/${totalTables} tables processed successfully`,
      details: {
        total: totalTables,
        successful: successfulTables,
        failed: failedTables.length,
        failedTables: failedTables.map(t => ({ name: t.tableName, error: t.error })),
      },
    };
  } catch (error) {
    console.error('Error in bulk auto-assign:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to auto-assign all tables',
    };
  }
}
