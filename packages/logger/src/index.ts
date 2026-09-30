import { trace, context } from "@opentelemetry/api";

export interface ILogContext {
  service: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  [key: string]: any;
}

/** Extract the active OTEL trace/span IDs from the current async context (zero-cost when no span is active). */
function getActiveTraceContext(): { traceId?: string; spanId?: string } {
  try {
    const span = trace.getSpan(context.active());
    const ctx = span?.spanContext();
    if (!ctx) return {};
    return { traceId: ctx.traceId, spanId: ctx.spanId };
  } catch {
    return {};
  }
}

export class AppLogger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  private formatMessage(
    level: string,
    message: string,
    extra?: Partial<ILogContext>,
  ) {
    const timestamp = new Date().toISOString();
    const traceCtx = getActiveTraceContext();
    const logObj = {
      timestamp,
      level: level.toUpperCase(),
      service: this.serviceName,
      message,
      ...traceCtx, // auto-injected: traceId, spanId
      ...extra,
    };
    return JSON.stringify(logObj);
  }

  info(message: string, context?: Partial<ILogContext>) {
    console.log(this.formatMessage("info", message, context));
  }

  warn(message: string, context?: Partial<ILogContext>) {
    console.warn(this.formatMessage("warn", message, context));
  }

  error(message: string, trace?: string, context?: Partial<ILogContext>) {
    console.error(this.formatMessage("error", message, { trace, ...context }));
  }

  debug(message: string, context?: Partial<ILogContext>) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.formatMessage("debug", message, context));
    }
  }
}

export const createLogger = (serviceName: string): AppLogger => {
  return new AppLogger(serviceName);
};
