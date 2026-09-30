import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsGrpcController } from "./analytics.grpc.controller";
import { AnalyticsEntity } from "../../entities/analytics.entity";

@Module({
  imports: [TypeOrmModule.forFeature([AnalyticsEntity])],
  controllers: [AnalyticsController, AnalyticsGrpcController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
