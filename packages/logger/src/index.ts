export interface ILogContext {
  service: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  [key: string]: any;
}

export class AppLogger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  private formatMessage(level: string, message: string, context?: ILogContext) {
    const timestamp = new Date().toISOString();
    const logObj = {
      timestamp,
      level: level.toUpperCase(),
      service: this.serviceName,
      message,
      ...context,
    };
    return JSON.stringify(logObj);
  }

  info(message: string, context?: Partial<ILogContext>) {
    console.log(this.formatMessage('info', message, { service: this.serviceName, ...context }));
  }

  warn(message: string, context?: Partial<ILogContext>) {
    console.warn(this.formatMessage('warn', message, { service: this.serviceName, ...context }));
  }

  error(message: string, trace?: string, context?: Partial<ILogContext>) {
    console.error(this.formatMessage('error', message, { service: this.serviceName, trace, ...context }));
  }

  debug(message: string, context?: Partial<ILogContext>) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message, { service: this.serviceName, ...context }));
    }
  }
}

export const createLogger = (serviceName: string): AppLogger => {
  return new AppLogger(serviceName);
};
