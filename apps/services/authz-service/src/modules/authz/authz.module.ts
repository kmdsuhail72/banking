import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthzController } from './authz.controller';
import { AuthzService } from './authz.service';
import { AuthzGrpcController } from './authz.grpc.controller';
import { AuthzEntity } from '../../entities/authz.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuthzEntity])],
  controllers: [AuthzController, AuthzGrpcController],
  providers: [AuthzService],
  exports: [AuthzService],
})
export class AuthzModule {}
