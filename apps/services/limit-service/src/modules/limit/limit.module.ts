import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LimitController } from "./limit.controller";
import { LimitService } from "./limit.service";
import { LimitGrpcController } from "./limit.grpc.controller";
import { LimitEntity } from "../../entities/limit.entity";

@Module({
  imports: [TypeOrmModule.forFeature([LimitEntity])],
  controllers: [LimitController, LimitGrpcController],
  providers: [LimitService],
  exports: [LimitService],
})
export class LimitModule {}
