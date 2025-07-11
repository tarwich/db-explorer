// @ts-ignore
import * as path from 'path';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'error',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      level: 'info',
    }),
  ],
});

export default logger;
