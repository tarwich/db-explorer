import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';

const CONNECTIONS_FILE = 'connections.json';

class ConnectionStorage {
  constructor() {
    this.storagePath = path.join(app.getPath('userData'), CONNECTIONS_FILE);
  }

  async initialize() {
    try {
      await fs.access(this.storagePath);
    } catch {
      // File doesn't exist, create it with empty array
      await this.saveConnections([]);
    }
  }

  async getConnections() {
    try {
      const data = await fs.readFile(this.storagePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading connections:', error);
      return [];
    }
  }

  async saveConnections(connections) {
    try {
      await fs.writeFile(
        this.storagePath,
        JSON.stringify(connections, null, 2),
        'utf8'
      );
      return true;
    } catch (error) {
      console.error('Error saving connections:', error);
      return false;
    }
  }

  async addConnection(connection) {
    const connections = await this.getConnections();
    connections.push(connection);
    return this.saveConnections(connections);
  }

  async updateConnection(id, updatedConnection) {
    const connections = await this.getConnections();
    const index = connections.findIndex((conn) => conn.id === id);
    if (index !== -1) {
      connections[index] = { ...connections[index], ...updatedConnection };
      return this.saveConnections(connections);
    }
    return false;
  }

  async deleteConnection(id) {
    const connections = await this.getConnections();
    const filteredConnections = connections.filter((conn) => conn.id !== id);
    return this.saveConnections(filteredConnections);
  }
}

export const connectionStorage = new ConnectionStorage();
