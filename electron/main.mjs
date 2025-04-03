import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectionStorage } from './storage.mjs';

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
