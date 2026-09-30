import { Controller, Get } from "@nestjs/common";
import { HealthIndicator } from "@banking/observability";
import { IServiceHealth } from "@banking/shared-types";

@Controller("health")
export class HealthController {
  private healthIndicator = new HealthIndicator("payment-service", "1.0.0");

  @Get()
  getHealth(): IServiceHealth {
    return this.healthIndicator.getHealth({
      mongodb: "connected",
      redis: "connected",
      kafka: "connected",
    });
  }
}
