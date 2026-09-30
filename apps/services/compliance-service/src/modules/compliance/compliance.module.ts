import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplianceController } from "./compliance.controller";
import { ComplianceService } from "./compliance.service";
import { ComplianceGrpcController } from "./compliance.grpc.controller";
import { ComplianceEntity } from "../../entities/compliance.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ComplianceEntity])],
  controllers: [ComplianceController, ComplianceGrpcController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
