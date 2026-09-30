import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InterestController } from "./interest.controller";
import { InterestService } from "./interest.service";
import { InterestGrpcController } from "./interest.grpc.controller";
import { InterestEntity } from "../../entities/interest.entity";

@Module({
  imports: [TypeOrmModule.forFeature([InterestEntity])],
  controllers: [InterestController, InterestGrpcController],
  providers: [InterestService],
  exports: [InterestService],
})
export class InterestModule {}
