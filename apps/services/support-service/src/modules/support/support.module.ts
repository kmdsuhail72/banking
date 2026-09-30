import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SupportController } from "./support.controller";
import { SupportService } from "./support.service";
import { SupportGrpcController } from "./support.grpc.controller";
import { SupportEntity } from "../../entities/support.entity";

@Module({
  imports: [TypeOrmModule.forFeature([SupportEntity])],
  controllers: [SupportController, SupportGrpcController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
