import pino from 'pino';
import { isProd } from '../config/env';

export const logger = pino({
  level: isProd ? 'info' : 'debug',
  base: { app: 'mwr-api' },
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
      },
});
