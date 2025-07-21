'use server';

import { openConnection } from '@/app/api/connections';
import { getTable } from '@/app/api/tables';
import { loadConnection } from '@/components/connection-modal/connection-modal.actions';
import { getPlugin } from '@/db/plugins';
import { Kysely } from 'kysely';
import logger from '../../lib/logger';

export interface TableSearchCapabilities {
  tableSize: 'small' | 'medium' | 'large';
  recordCount: number;
  searchableColumns: Array<{
    name: string;
    type: string;
    displayName: string;
    searchType: 'exact' | 'text' | 'numeric' | 'date' | 'fulltext';
    indexed: boolean;
    priority: number; // Higher priority columns appear first in search suggestions
  }>;
  searchStrategies: Array<{
    type: 'fulltext' | 'column_specific' | 'exact_match' | 'fuzzy';
    description: string;
    performance: 'fast' | 'medium' | 'slow';
    recommended: boolean;
  }>;
  maxSearchResults: number;
  supportsFullText: boolean;
}

export async function analyzeTableSearchCapabilities(
  connectionId: string,
  tableName: string
): Promise<TableSearchCapabilities> {
  try {
    const db = await openConnection(connectionId);
    const connection = await loadConnection(connectionId);
    const table = await getTable(connectionId, tableName);
    const dbPlugin = await getPlugin(connection!);

    // Get record count
    const [{ count }] = await db
      .selectFrom(tableName)
      .select((eb) => eb.fn.countAll().as('count'))
      .execute();

    const recordCount = Number(count);

    // Determine table size category
    let tableSize: 'small' | 'medium' | 'large';
    if (recordCount < 1000) {
      tableSize = 'small';
    } else if (recordCount < 100000) {
      tableSize = 'medium';
    } else {
      tableSize = 'large';
    }

    // Analyze searchable columns
    const searchableColumns = await analyzeSearchableColumns(
      connectionId,
      tableName,
      table.details.columns,
      connection!.type
    );

    // Determine search strategies based on table size and database type
    const searchStrategies = determineSearchStrategies(
      tableSize,
      recordCount,
      connection!.type,
      searchableColumns
    );

    const maxSearchResults =
      tableSize === 'small' ? recordCount : tableSize === 'medium' ? 1000 : 500;

    const supportsFullText = connection!.type === 'postgres';

    return {
      tableSize,
      recordCount,
      searchableColumns,
      searchStrategies,
      maxSearchResults,
      supportsFullText,
    };
  } catch (error) {
    logger.error('Failed to analyze table search capabilities:', error);
    throw error;
  }
}

async function analyzeSearchableColumns(
  connectionId: string,
  tableName: string,
  columns: Record<string, any>,
  dbType: string
): Promise<TableSearchCapabilities['searchableColumns']> {
  const db = await openConnection(connectionId);
  const table = await getTable(connectionId, tableName);
  const searchableColumns: TableSearchCapabilities['searchableColumns'] = [];

  // For now, we'll assume primary key columns are indexed and prioritize common patterns
  // TODO: Implement proper index detection in the future
  const indexedColumns = new Set<string>();
  const primaryKeys = table.details.pk || [];
  primaryKeys.forEach((pk) => indexedColumns.add(pk));

  for (const [columnName, column] of Object.entries(columns)) {
    const isIndexed = indexedColumns.has(columnName);
    let searchType: 'exact' | 'text' | 'numeric' | 'date' | 'fulltext';
    let priority = 0;

    // Determine search type based on column type and characteristics
    const columnType = column.type.toLowerCase();

    if (
      columnType.includes('text') ||
      columnType.includes('varchar') ||
      columnType.includes('char') ||
      columnType.includes('string')
    ) {
      searchType = 'text';
      priority = column.name.toLowerCase().includes('name')
        ? 10
        : column.name.toLowerCase().includes('title')
        ? 9
        : column.name.toLowerCase().includes('description')
        ? 8
        : 5;
    } else if (
      columnType.includes('int') ||
      columnType.includes('numeric') ||
      columnType.includes('decimal') ||
      columnType.includes('float') ||
      columnType.includes('double')
    ) {
      searchType = 'numeric';
      priority = column.name.toLowerCase().includes('id') ? 3 : 4;
    } else if (
      columnType.includes('date') ||
      columnType.includes('timestamp') ||
      columnType.includes('time')
    ) {
      searchType = 'date';
      priority = 6;
    } else if (columnType.includes('uuid')) {
      searchType = 'exact';
      priority = 2;
    } else if (columnType.includes('bool')) {
      // Skip boolean columns entirely as they can't be searched with text
      continue;
    } else if (columnType.includes('json') || columnType.includes('jsonb')) {
      // Skip JSON columns as they can't be compared with simple equality
      continue;
    } else {
      // For unknown types, try exact matching instead of text
      searchType = 'exact';
      priority = 3;
    }

    // Boost priority for indexed columns
    if (isIndexed) {
      priority += 2;
    }

    // Don't include hidden columns or very low priority columns in search
    if (!column.hidden && priority > 1) {
      searchableColumns.push({
        name: columnName,
        type: column.type,
        displayName: column.displayName,
        searchType,
        indexed: isIndexed,
        priority,
      });
    }
  }

  // Sort by priority (highest first)
  return searchableColumns.sort((a, b) => b.priority - a.priority);
}

function determineSearchStrategies(
  tableSize: 'small' | 'medium' | 'large',
  recordCount: number,
  dbType: string,
  searchableColumns: TableSearchCapabilities['searchableColumns']
): TableSearchCapabilities['searchStrategies'] {
  const strategies: TableSearchCapabilities['searchStrategies'] = [];

  // Full-text search strategy
  if (dbType === 'postgres' && tableSize !== 'large') {
    strategies.push({
      type: 'fulltext',
      description: 'Search across all text fields using ILIKE pattern matching',
      performance: tableSize === 'small' ? 'fast' : 'medium',
      recommended: tableSize === 'small' || tableSize === 'medium',
    });
  }

  // Column-specific search
  const hasIndexedTextColumns = searchableColumns.some(
    (col) => col.indexed && col.searchType === 'text'
  );

  strategies.push({
    type: 'column_specific',
    description:
      'Search within specific columns with intelligent type handling',
    performance: hasIndexedTextColumns ? 'fast' : 'medium',
    recommended: true,
  });

  // Exact match for IDs and specific values
  const hasIdColumns = searchableColumns.some(
    (col) => col.name.toLowerCase().includes('id') || col.searchType === 'exact'
  );

  if (hasIdColumns) {
    strategies.push({
      type: 'exact_match',
      description: 'Exact matching for IDs and specific field values',
      performance: 'fast',
      recommended: true,
    });
  }

  // Fuzzy search for large tables
  if (tableSize === 'large') {
    strategies.push({
      type: 'fuzzy',
      description: 'Fuzzy matching with result limits for large datasets',
      performance: 'slow',
      recommended: false,
    });
  }

  return strategies;
}

export async function searchTableRecords(
  connectionId: string,
  tableName: string,
  query: string,
  options: {
    searchType?: 'fulltext' | 'column_specific' | 'exact_match';
    columns?: string[];
    offset?: number;
    limit?: number;
  } = {}
) {
  const {
    searchType = 'column_specific',
    columns,
    offset = 0,
    limit = 50,
  } = options;

  try {
    const db = await openConnection(connectionId);
    const connection = await loadConnection(connectionId);
    const table = await getTable(connectionId, tableName);
    const capabilities = await analyzeTableSearchCapabilities(
      connectionId,
      tableName
    );

    if (!query.trim()) {
      // Return empty results for empty queries
      return {
        records: [],
        hasNextPage: false,
        nextOffset: undefined,
        total: 0,
        searchInfo: {
          query,
          searchType,
          strategy: 'none',
          performance: 'fast' as const,
        },
      };
    }

    let searchResults: any[];
    let totalCount: number;

    switch (searchType) {
      case 'fulltext':
        ({ records: searchResults, total: totalCount } =
          await performFullTextSearch(
            db,
            tableName,
            query,
            table,
            capabilities,
            offset,
            limit,
            connection!.type
          ));
        break;

      case 'column_specific':
        ({ records: searchResults, total: totalCount } =
          await performColumnSpecificSearch(
            db,
            tableName,
            query,
            table,
            capabilities,
            columns,
            offset,
            limit
          ));
        break;

      case 'exact_match':
        ({ records: searchResults, total: totalCount } =
          await performExactMatchSearch(
            db,
            tableName,
            query,
            table,
            capabilities,
            columns,
            offset,
            limit
          ));
        break;

      default:
        throw new Error(`Unsupported search type: ${searchType}`);
    }

    // Apply the same FK resolution and calculated columns as the regular records API
    const processedResults = await processSearchResults(
      searchResults,
      table,
      connectionId,
      db
    );

    const hasNextPage =
      offset + searchResults.length <
      Math.min(totalCount, capabilities.maxSearchResults);

    return {
      records: processedResults,
      hasNextPage,
      nextOffset: hasNextPage ? offset + searchResults.length : undefined,
      total: totalCount,
      searchInfo: {
        query,
        searchType,
        strategy: searchType,
        performance: getSearchPerformance(capabilities, searchType),
      },
    };
  } catch (error) {
    logger.error('Search failed:', error);
    throw error;
  }
}

async function performFullTextSearch(
  db: Kysely<any>,
  tableName: string,
  query: string,
  table: any,
  capabilities: TableSearchCapabilities,
  offset: number,
  limit: number,
  dbType: string
) {
  const textColumns = capabilities.searchableColumns
    .filter((col) => col.searchType === 'text')
    .map((col) => col.name);

  if (textColumns.length === 0) {
    return { records: [], total: 0 };
  }

  // Use simple LIKE pattern for text search
  const searchPattern = `%${query}%`;

  // Build OR conditions for all text columns using expression builder
  const queryBuilder = db
    .selectFrom(tableName)
    .selectAll()
    .where((eb) => {
      const conditions = textColumns.map((col) =>
        eb(col, 'like', searchPattern)
      );
      return eb.or(conditions);
    });

  // Get total count
  const countBuilder = db
    .selectFrom(tableName)
    .select(db.fn.countAll().as('count'))
    .where((eb) => {
      const conditions = textColumns.map((col) =>
        eb(col, 'like', searchPattern)
      );
      return eb.or(conditions);
    });
  const [{ count }] = await countBuilder.execute();
  const totalCount = Number(count);

  // Get records with limit and offset
  const records = await queryBuilder.limit(limit).offset(offset).execute();

  return { records, total: totalCount };
}

async function performColumnSpecificSearch(
  db: Kysely<any>,
  tableName: string,
  query: string,
  table: any,
  capabilities: TableSearchCapabilities,
  targetColumns: string[] | undefined,
  offset: number,
  limit: number
) {
  const searchableColumns = targetColumns
    ? capabilities.searchableColumns.filter((col) =>
        targetColumns.includes(col.name)
      )
    : capabilities.searchableColumns;

  if (searchableColumns.length === 0) {
    return { records: [], total: 0 };
  }

  // Build conditions array
  const conditions: any[] = [];

  for (const column of searchableColumns) {
    if (column.searchType === 'text') {
      conditions.push((eb: any) => eb(column.name, 'like', `%${query}%`));
    } else if (column.searchType === 'numeric') {
      const numericQuery = parseFloat(query);
      if (!isNaN(numericQuery)) {
        conditions.push((eb: any) => eb(column.name, '=', numericQuery));
      }
    } else if (column.searchType === 'exact') {
      // Only include exact matches if the query could be valid for this column type
      const columnType = column.type?.toLowerCase() || '';
      if (columnType.includes('uuid')) {
        // Only include UUID columns if the query looks like a UUID
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(query)) {
          conditions.push((eb: any) => eb(column.name, '=', query));
        }
      } else {
        // For non-UUID exact matches, include as-is
        conditions.push((eb: any) => eb(column.name, '=', query));
      }
    }
  }

  if (conditions.length === 0) {
    return { records: [], total: 0 };
  }

  // Build query with OR conditions using expression builder
  const queryBuilder = db
    .selectFrom(tableName)
    .selectAll()
    .where((eb) => eb.or(conditions.map((condition) => condition(eb))));

  // Get total count
  const countBuilder = db
    .selectFrom(tableName)
    .select(db.fn.countAll().as('count'))
    .where((eb) => eb.or(conditions.map((condition) => condition(eb))));
  const [{ count }] = await countBuilder.execute();
  const totalCount = Number(count);

  // Get records with limit and offset
  const records = await queryBuilder.limit(limit).offset(offset).execute();

  return { records, total: totalCount };
}

async function performExactMatchSearch(
  db: Kysely<any>,
  tableName: string,
  query: string,
  table: any,
  capabilities: TableSearchCapabilities,
  targetColumns: string[] | undefined,
  offset: number,
  limit: number
) {
  const exactColumns = capabilities.searchableColumns.filter(
    (col) => col.searchType === 'exact' || col.name.toLowerCase().includes('id')
  );

  const searchColumns = targetColumns
    ? exactColumns.filter((col) => targetColumns.includes(col.name))
    : exactColumns;

  if (searchColumns.length === 0) {
    return { records: [], total: 0 };
  }

  // Build OR conditions for exact matching using expression builder with validation
  const validConditions: any[] = [];

  for (const col of searchColumns) {
    const columnType = col.type?.toLowerCase() || '';
    if (columnType.includes('uuid')) {
      // Only include UUID columns if the query looks like a UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(query)) {
        validConditions.push((eb: any) => eb(col.name, '=', query));
      }
    } else {
      // For non-UUID exact matches, include as-is
      validConditions.push((eb: any) => eb(col.name, '=', query));
    }
  }

  if (validConditions.length === 0) {
    return { records: [], total: 0 };
  }

  const queryBuilder = db
    .selectFrom(tableName)
    .selectAll()
    .where((eb) => eb.or(validConditions.map((condition) => condition(eb))));

  // Get total count
  const countBuilder = db
    .selectFrom(tableName)
    .select(db.fn.countAll().as('count'))
    .where((eb) => eb.or(validConditions.map((condition) => condition(eb))));
  const [{ count }] = await countBuilder.execute();
  const totalCount = Number(count);

  // Get records with limit and offset
  const records = await queryBuilder.limit(limit).offset(offset).execute();

  return { records, total: totalCount };
}

async function processSearchResults(
  records: any[],
  table: any,
  connectionId: string,
  db: any
) {
  // Apply the same FK resolution logic as getTableRecordsInfinite
  const fkColumns = Object.values(table.details.columns).filter(
    (col: any) => col.foreignKey
  );

  const fkValueMap: Record<string, Set<any>> = {};
  for (const col of fkColumns) {
    fkValueMap[(col as any).name] = new Set(
      records.map((r: any) => r[(col as any).name]).filter((v) => v != null)
    );
  }

  const fkDisplayMap: Record<
    string,
    Record<any, { displayValue: string; icon: string }>
  > = {};
  for (const col of fkColumns) {
    const fk = (col as any).foreignKey!;
    const targetTable = await getTable(connectionId, fk.targetTable);
    const displayColumns =
      require('@/utils/display-columns').determineDisplayColumns({
        ...targetTable,
        details: {
          ...targetTable.details,
          columns: Object.values(targetTable.details.columns),
        },
      });
    const values = Array.from(fkValueMap[(col as any).name]);
    if (values.length === 0) {
      fkDisplayMap[(col as any).name] = {};
      continue;
    }

    const relatedRecords = await db
      .selectFrom(fk.targetTable)
      .select([...displayColumns, fk.targetColumn])
      .where(fk.targetColumn, 'in', values)
      .execute();

    fkDisplayMap[(col as any).name] = Object.fromEntries(
      relatedRecords.map((r: any) => [
        r[fk.targetColumn],
        {
          displayValue: displayColumns
            .map((colName: string) => r[colName])
            .filter(Boolean)
            .join(' '),
          icon: targetTable.details.icon,
        },
      ])
    );
  }

  const recordsWithDisplay = records.map((record: any) => {
    const newRecord: Record<string, any> = { ...record };
    for (const col of fkColumns) {
      const val = record[(col as any).name];
      if (val != null && fkDisplayMap[(col as any).name][val] !== undefined) {
        newRecord[(col as any).name] = {
          value: fkDisplayMap[(col as any).name][val].displayValue,
          icon: fkDisplayMap[(col as any).name][val].icon,
        };
      }
    }
    return newRecord;
  });

  // Add calculated columns
  const {
    addCalculatedColumnsToRecords,
  } = require('@/utils/calculated-columns');
  return addCalculatedColumnsToRecords(
    recordsWithDisplay,
    table.details.calculatedColumns || []
  );
}

function getSearchPerformance(
  capabilities: TableSearchCapabilities,
  searchType: string
): 'fast' | 'medium' | 'slow' {
  const strategy = capabilities.searchStrategies.find(
    (s) => s.type === searchType
  );
  return strategy?.performance || 'medium';
}
