import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { SchedulerGrpcController } from './scheduler.grpc.controller';
import { SchedulerEntity } from '../../entities/scheduler.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SchedulerEntity])],
  controllers: [SchedulerController, SchedulerGrpcController],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
