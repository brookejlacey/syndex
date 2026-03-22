import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

const syndexFormat = printf(({ level, message, timestamp: ts, ...metadata }) => {
  const meta = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';
  return `${ts} [${level}] ${message}${meta}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'HH:mm:ss.SSS' }),
    syndexFormat,
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), syndexFormat),
    }),
    new winston.transports.File({
      filename: 'syndex.log',
      maxsize: 10_000_000,
      maxFiles: 3,
    }),
  ],
});
