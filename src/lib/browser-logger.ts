import { inspect } from "util";


// Simple browser logger that sends logs to the server
const browserLogger = {
  error: async (message: string, meta?: any) => {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level: 'error',
          message,
          meta: inspect(meta, { depth: 7, colors: false }),
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to send log to server:', error);
    }
  },
  
  warn: async (message: string, meta?: any) => {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level: 'warn',
          message,
          meta,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to send log to server:', error);
    }
  },
  
  info: async (message: string, meta?: any) => {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level: 'info',
          message,
          meta,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to send log to server:', error);
    }
  },
};

export default browserLogger;
