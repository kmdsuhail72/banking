import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatementController } from './statement.controller';
import { StatementService } from './statement.service';
import { StatementGrpcController } from './statement.grpc.controller';
import { StatementEntity } from '../../entities/statement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StatementEntity])],
  controllers: [StatementController, StatementGrpcController],
  providers: [StatementService],
  exports: [StatementService],
})
export class StatementModule {}
