import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IdempotencyKey, IdempotencyDocument } from '../schemas/idempotency.schema';
import { createLogger } from '@banking/logger';

@Injectable()
export class IdempotencyService {
  private logger = createLogger('IdempotencyService');

  constructor(
    @InjectModel(IdempotencyKey.name)
    private idempotencyModel: Model<IdempotencyDocument>,
  ) {}

  async getStoredResponse(userId: string, key: string): Promise<any | null> {
    if (!key) return null;
    const record = await this.idempotencyModel.findOne({ userId, key }).exec();
    if (record) {
      this.logger.info(`Idempotency cache hit for key '${key}', user '${userId}'`);
      return record.responseBody;
    }
    return null;
  }

  async storeResponse(
    userId: string,
    key: string,
    transactionId: string,
    responseBody: any,
  ): Promise<void> {
    if (!key) return;
    try {
      await this.idempotencyModel.create({
        userId,
        key,
        transactionId,
        status: 'COMPLETED',
        responseBody,
      });
      this.logger.info(`Idempotency record saved for key '${key}' -> txn '${transactionId}'`);
    } catch (err: any) {
      this.logger.warn(`Failed to store idempotency record: ${err.message}`);
    }
  }
}
