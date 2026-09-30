import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FeeController } from "./fee.controller";
import { FeeService } from "./fee.service";
import { FeeGrpcController } from "./fee.grpc.controller";
import { FeeEntity } from "../../entities/fee.entity";

@Module({
  imports: [TypeOrmModule.forFeature([FeeEntity])],
  controllers: [FeeController, FeeGrpcController],
  providers: [FeeService],
  exports: [FeeService],
})
export class FeeModule {}
