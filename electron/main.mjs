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

// Initialize storage and IPC handlers
async function initialize() {
  await connectionStorage.initialize();

  // IPC handlers for connection management
  ipcMain.handle('get-connections', () => connectionStorage.getConnections());

  ipcMain.handle('add-connection', (_, connection) =>
    connectionStorage.addConnection(connection)
  );

  ipcMain.handle('update-connection', (_, { id, connection }) =>
    connectionStorage.updateConnection(id, connection)
  );

  ipcMain.handle('delete-connection', (_, id) =>
    connectionStorage.deleteConnection(id)
  );

  ipcMain.handle('test-connection', async (_, connection) => {
    return testConnection(connection);
  });
}

app.whenReady().then(() => {
  initialize();
  createWindow();
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
