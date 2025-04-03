import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  connections: {
    getAll: () => ipcRenderer.invoke('connections:getAll'),
    add: (connection) => ipcRenderer.invoke('connections:add', connection),
    update: (id, connection) =>
      ipcRenderer.invoke('connections:update', id, connection),
    delete: (id) => ipcRenderer.invoke('connections:delete', id),
    test: (connection) => ipcRenderer.invoke('connections:test', connection),
  },
  tables: {
    getAll: (connection) => ipcRenderer.invoke('tables:getAll', connection),
    getData: (connection, schema, table) =>
      ipcRenderer.invoke('tables:getData', connection, schema, table),
  },
});
