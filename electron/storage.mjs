import Store from 'electron-store';

const store = new Store({
  name: 'connections',
  defaults: {
    connections: [],
  },
});

export const connectionStorage = {
  getAll: () => {
    return store.get('connections');
  },

  add: (connection) => {
    const connections = store.get('connections');
    connections.push(connection);
    store.set('connections', connections);
    return true;
  },

  update: (id, connection) => {
    const connections = store.get('connections');
    const index = connections.findIndex((c) => c.id === id);
    if (index !== -1) {
      connections[index] = { ...connections[index], ...connection };
      store.set('connections', connections);
      return true;
    }
    return false;
  },

  delete: (id) => {
    const connections = store.get('connections');
    const filtered = connections.filter((c) => c.id !== id);
    if (filtered.length !== connections.length) {
      store.set('connections', filtered);
      return true;
    }
    return false;
  },
};
