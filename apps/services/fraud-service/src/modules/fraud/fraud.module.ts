import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FraudController } from "./fraud.controller";
import { FraudService } from "./fraud.service";
import { FraudGrpcController } from "./fraud.grpc.controller";
import { FraudEntity } from "../../entities/fraud.entity";

@Module({
  imports: [TypeOrmModule.forFeature([FraudEntity])],
  controllers: [FraudController, FraudGrpcController],
  providers: [FraudService],
  exports: [FraudService],
})
export class FraudModule {}
