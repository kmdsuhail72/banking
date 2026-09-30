import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanController } from './loan.controller';
import { LoanService } from './loan.service';
import { LoanGrpcController } from './loan.grpc.controller';
import { LoanEntity } from '../../entities/loan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LoanEntity])],
  controllers: [LoanController, LoanGrpcController],
  providers: [LoanService],
  exports: [LoanService],
})
export class LoanModule {}
