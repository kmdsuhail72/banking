import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FixedDepositController } from './fixeddeposit.controller';
import { FixedDepositService } from './fixeddeposit.service';
import { FixedDepositGrpcController } from './fixeddeposit.grpc.controller';
import { FixedDepositEntity } from '../../entities/fixeddeposit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FixedDepositEntity])],
  controllers: [FixedDepositController, FixedDepositGrpcController],
  providers: [FixedDepositService],
  exports: [FixedDepositService],
})
export class FixedDepositModule {}
