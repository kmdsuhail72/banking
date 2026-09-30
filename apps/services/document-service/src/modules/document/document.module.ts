import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DocumentGrpcController } from './document.grpc.controller';
import { DocumentEntity } from '../../entities/document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity])],
  controllers: [DocumentController, DocumentGrpcController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
