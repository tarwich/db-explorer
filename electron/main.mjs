import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectionStorage } from './storage.mjs';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV !== 'production';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:3005'
    : `file://${path.join(__dirname, '../out/index.html')}`;

  mainWindow.loadURL(startUrl);
}

async function testConnection(connection) {
  const client = new pg.Client({
    host: connection.host,
    port: connection.port,
    database: connection.database,
    user: connection.username,
    password: connection.password,
    // Timeout after 5 seconds
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
      error: error.message,
    };
  }
}

async function getTables(connection) {
  const client = new pg.Client({
    host: connection.host,
    port: connection.port,
    database: connection.database,
    user: connection.username,
    password: connection.password,
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
    return { success: true, tables: result.rows };
  } catch (error) {
    console.error('Error getting tables:', error);
    try {
      await client.end();
    } catch {}
    return {
      success: false,
      error: error.message,
    };
  }
}

async function getTableData(
  connection,
  schema,
  table,
  page = 1,
  pageSize = 50
) {
  const client = new pg.Client({
    host: connection.host,
    port: connection.port,
    database: connection.database,
    user: connection.username,
    password: connection.password,
  });

  try {
    await client.connect();

    // First get the column information
    const columnsResult = await client.query(
      `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
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

    // Then get the actual data with pagination
    const offset = (page - 1) * pageSize;
    const dataResult = await client.query(
      `
      SELECT *
      FROM ${client.escapeIdentifier(schema)}.${client.escapeIdentifier(table)}
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
    console.error('Error getting table data:', error);
    try {
      await client.end();
    } catch {}
    return {
      success: false,
      error: error.message,
    };
  }
}

async function updateRecord(connection, schema, table, record) {
  const client = new pg.Client({
    host: connection.host,
    port: connection.port,
    database: connection.database,
    user: connection.username,
    password: connection.password,
  });

  try {
    await client.connect();

    // Get primary key columns
    const pkResult = await client.query(
      `
      SELECT a.attname as column_name
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary
    `,
      [`${schema}.${table}`]
    );

    if (pkResult.rows.length === 0) {
      throw new Error('Table must have a primary key to update records');
    }

    const pkColumns = pkResult.rows.map((row) => row.column_name);

    // Build WHERE clause using primary key columns
    const whereClause = pkColumns
      .map((col, i) => `${client.escapeIdentifier(col)} = $${i + 1}`)
      .join(' AND ');
    const pkValues = pkColumns.map((col) => record[col]);

    // Build SET clause for non-PK columns
    const updateColumns = Object.keys(record).filter(
      (col) => !pkColumns.includes(col)
    );
    const setClause = updateColumns
      .map(
        (col, i) =>
          `${client.escapeIdentifier(col)} = $${i + pkColumns.length + 1}`
      )
      .join(', ');
    const updateValues = updateColumns.map((col) => record[col]);

    // Execute UPDATE query
    const query = `
      UPDATE ${client.escapeIdentifier(schema)}.${client.escapeIdentifier(
      table
    )}
      SET ${setClause}
      WHERE ${whereClause}
      RETURNING *
    `;

    const result = await client.query(query, [...pkValues, ...updateValues]);

    if (result.rows.length === 0) {
      throw new Error('Record not found');
    }

    await client.end();
    return { success: true, record: result.rows[0] };
  } catch (error) {
    console.error('Error updating record:', error);
    try {
      await client.end();
    } catch {}
    return {
      success: false,
      error: error.message,
    };
  }
}

// Initialize storage and IPC handlers
app.whenReady().then(() => {
  // Connection handlers
  ipcMain.handle('connections:getAll', async () => {
    return connectionStorage.getAll();
  });

  ipcMain.handle('connections:add', async (event, connection) => {
    return connectionStorage.add(connection);
  });

  ipcMain.handle('connections:update', async (event, id, connection) => {
    return connectionStorage.update(id, connection);
  });

  ipcMain.handle('connections:delete', async (event, id) => {
    return connectionStorage.delete(id);
  });

  ipcMain.handle('connections:test', async (event, connection) => {
    return testConnection(connection);
  });

  ipcMain.handle('tables:getAll', async (event, connection) => {
    return getTables(connection);
  });

  ipcMain.handle(
    'tables:getData',
    async (event, connection, schema, table, page, pageSize) => {
      return getTableData(connection, schema, table, page, pageSize);
    }
  );

  ipcMain.handle(
    'tables:updateRecord',
    async (event, connection, schema, table, record) => {
      return updateRecord(connection, schema, table, record);
    }
  );

  createWindow();

  // Enable DevTools in development
  if (isDev) {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    mainWindow.webContents.openDevTools();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
