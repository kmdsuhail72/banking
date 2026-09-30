import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmiController } from "./emi.controller";
import { EmiService } from "./emi.service";
import { EmiGrpcController } from "./emi.grpc.controller";
import { EmiEntity } from "../../entities/emi.entity";

@Module({
  imports: [TypeOrmModule.forFeature([EmiEntity])],
  controllers: [EmiController, EmiGrpcController],
  providers: [EmiService],
  exports: [EmiService],
})
export class EmiModule {}
