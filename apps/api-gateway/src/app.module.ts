import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { ProxyController } from "./proxy/proxy.controller";
import { ProxyService } from "./proxy/proxy.service";
import { AuthMiddleware } from "./middleware/auth.middleware";
import { RateLimiterMiddleware } from "./middleware/rate-limiter.middleware";

@Module({
  imports: [HealthModule],
  controllers: [ProxyController],
  providers: [ProxyService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RateLimiterMiddleware).forRoutes("*");
    consumer.apply(AuthMiddleware).forRoutes("api/v1/*");
  }
}
