// Helper function to safely serialize objects for logging
const safeSerialize = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
    };
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => safeSerialize(item));
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      try {
        serialized[key] = safeSerialize(value);
      } catch (error) {
        serialized[key] = `[Serialization Error: ${error instanceof Error ? error.message : 'Unknown error'}]`;
      }
    }
    return serialized;
  }
  
  // For functions and other non-serializable types
  return `[${typeof obj}]`;
};

// Simple browser logger that sends logs to the server
const browserLogger = {
  error: async (message: string, meta?: any) => {
    try {
      console.error(message, meta);
      
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level: 'error',
          message,
          meta: safeSerialize(meta),
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to send log to server:', error);
    }
  },
  
  warn: async (message: string, meta?: any) => {
    try {
      console.warn(message, meta);
      
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level: 'warn',
          message,
          meta: safeSerialize(meta),
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to send log to server:', error);
    }
  },
  
  info: async (message: string, meta?: any) => {  
    console.info(message, meta);
    
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level: 'info',
          message,
          meta: safeSerialize(meta),
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to send log to server:', error);
    }
  },
};

export default browserLogger;
