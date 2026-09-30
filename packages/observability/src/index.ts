import { IServiceHealth } from "@banking/shared-types";
export * from "./tracing";
export * from "./metrics";

export class HealthIndicator {
  private serviceName: string;
  private version: string;
  private startTime: number;

  constructor(serviceName: string, version = "1.0.0") {
    this.serviceName = serviceName;
    this.version = version;
    this.startTime = Date.now();
  }

  getHealth(dependencies?: IServiceHealth["dependencies"]): IServiceHealth {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    return {
      status: "ok",
      service: this.serviceName,
      version: this.version,
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      dependencies,
    };
  }
}
