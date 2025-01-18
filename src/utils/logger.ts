import winston from 'winston';
import { format } from 'winston';
const { combine, timestamp, printf, colorize } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present (excluding level, message, and timestamp)
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }

    return msg;
});

type LogMeta = Record<string, any>;

export class Logger {
    private static instance: winston.Logger;

    private static getInstance(): winston.Logger {
        if (!Logger.instance) {
            Logger.instance = winston.createLogger({
                level: process.env.LOG_LEVEL || 'info',
                format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
                transports: [
                    new winston.transports.Console({
                        format: combine(colorize(), logFormat),
                    }),
                    new winston.transports.File({
                        filename: 'logs/combined.log',
                        maxsize: 5242880, // 5MB
                        maxFiles: 5,
                    }),
                ],
            });
        }
        return Logger.instance;
    }

    public static info(message: string, meta?: LogMeta): void {
        this.getInstance().info(message, meta);
    }

    public static error(message: string | Error, meta?: LogMeta): void {
        if (message instanceof Error) {
            this.getInstance().error(message.message, { ...meta, stack: message.stack });
        } else {
            this.getInstance().error(message, meta);
        }

        if (process.env.NODE_ENV !== 'production') {
            console.error(message, meta);
        }
    }

    public static warn(message: string, meta?: LogMeta): void {
        this.getInstance().warn(message, meta);
    }

    public static debug(message: string, meta?: LogMeta): void {
        this.getInstance().debug(message, meta);
    }
}
