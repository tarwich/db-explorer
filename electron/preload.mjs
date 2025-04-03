import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  connections: {
    getAll: () => ipcRenderer.invoke('get-connections'),
    add: (connection) => ipcRenderer.invoke('add-connection', connection),
    update: (id, connection) =>
      ipcRenderer.invoke('update-connection', { id, connection }),
    delete: (id) => ipcRenderer.invoke('delete-connection', id),
  },
});
