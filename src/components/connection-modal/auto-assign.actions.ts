'use server';

import { getTable, getTables, saveTable } from '@/app/api/tables';
import { getBestIcon, getBestIconForType } from '@/utils/best-icon';
import { guessForeignKeys } from '@/utils/foreign-key-guesser';
import { normalizeName } from '@/utils/normalize-name';
import { plural, singular } from 'pluralize';
import { title } from 'radash';

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
    const tableIcon = await getBestIcon(normalizedTableName);
    const singularName = title(singular(normalizedTableName));
    const pluralName = title(plural(normalizedTableName));
    
    // Auto-assign column settings
    const updatedColumns = { ...table.details.columns };
    const columnArray = Object.values(updatedColumns);
    
    // Guess foreign keys
    const foreignKeyGuesses = guessForeignKeys(columnArray, allTables);
    
    // Update each column with auto-assigned settings
    for (const column of columnArray) {
      const normalizedColName = normalizeName(column.name);
      const columnIcon = await getBestIconForType(column.type);
      const displayName = title(normalizedColName);
      
      // Find foreign key guess for this column
      const fkGuess = foreignKeyGuesses.find(
        (guess) => guess.sourceColumn === column.name && guess.confidence > 0
      );
      
      updatedColumns[column.name] = {
        ...column,
        displayName,
        icon: columnIcon,
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
