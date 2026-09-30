import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminGrpcController } from "./admin.grpc.controller";
import { AdminEntity } from "../../entities/admin.entity";

@Module({
  imports: [TypeOrmModule.forFeature([AdminEntity])],
  controllers: [AdminController, AdminGrpcController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
