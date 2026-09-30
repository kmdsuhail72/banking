import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangeController } from './exchange.controller';
import { ExchangeService } from './exchange.service';
import { ExchangeGrpcController } from './exchange.grpc.controller';
import { ExchangeEntity } from '../../entities/exchange.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExchangeEntity])],
  controllers: [ExchangeController, ExchangeGrpcController],
  providers: [ExchangeService],
  exports: [ExchangeService],
})
export class ExchangeModule {}
