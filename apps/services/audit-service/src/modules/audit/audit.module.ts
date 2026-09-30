import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";
import { AuditGrpcController } from "./audit.grpc.controller";
import { AuditEntity } from "../../entities/audit.entity";

@Module({
  imports: [TypeOrmModule.forFeature([AuditEntity])],
  controllers: [AuditController, AuditGrpcController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
