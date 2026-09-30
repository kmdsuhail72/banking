import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RecurringDepositController } from "./recurringdeposit.controller";
import { RecurringDepositService } from "./recurringdeposit.service";
import { RecurringDepositGrpcController } from "./recurringdeposit.grpc.controller";
import { RecurringDepositEntity } from "../../entities/recurringdeposit.entity";

@Module({
  imports: [TypeOrmModule.forFeature([RecurringDepositEntity])],
  controllers: [RecurringDepositController, RecurringDepositGrpcController],
  providers: [RecurringDepositService],
  exports: [RecurringDepositService],
})
export class RecurringDepositModule {}
