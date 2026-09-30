import { Module } from '@nestjs/common';
import { DatabaseModule } from '@banking/database';
import { HealthModule } from './health/health.module';
import { DocumentModule } from './modules/document/document.module';
import { DocOutboxEntity } from './entities/doc-outbox.entity';
import { DocumentEntity } from './entities/document.entity';

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [DocumentEntity, DocOutboxEntity],
    }),
    HealthModule,
    DocumentModule,
  ],
})
export class AppModule {}
