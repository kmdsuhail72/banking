import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationTypeEnum,
} from './schemas/notification.schema';
import { KafkaEventBus } from '@banking/kafka';
import { createLogger } from '@banking/logger';
import { appConfig } from '@banking/config';
import {
  KafkaTopics,
  IMoneyDepositedPayload,
  IMoneyWithdrawnPayload,
  IMoneyTransferredPayload,
  IAccountCreatedPayload,
  IBankingEvent,
} from '@banking/shared-types';

@Injectable()
export class NotificationService {
  private logger = createLogger('NotificationService');
  private eventBus = new KafkaEventBus({
    clientId: 'notification-service',
    brokers: appConfig.kafka.brokers,
  });

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  async onModuleInit() {
    try {
      await this.startKafkaConsumer();
      this.logger.info('NotificationService Kafka consumer started');
    } catch (err: any) {
      this.logger.warn(`Kafka consumer startup warning: ${err.message}`);
    }
  }

  // ─── Kafka Consumer ───────────────────────────────────────────────────────

  private async startKafkaConsumer() {
    const consumer = await this.eventBus.getConsumer('notification-service-group');

    const topics = [
      KafkaTopics.MONEY_DEPOSITED,
      KafkaTopics.MONEY_WITHDRAWN,
      KafkaTopics.MONEY_TRANSFERRED,
      KafkaTopics.ACCOUNT_CREATED,
      KafkaTopics.PAYMENT_COMPLETED,
      KafkaTopics.PAYMENT_FAILED,
    ];

    await consumer.subscribe({ topics, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          const raw = message.value?.toString();
          if (!raw) return;
          const event: IBankingEvent = JSON.parse(raw);
          await this.handleEvent(topic, event);
        } catch (err: any) {
          this.logger.error(`Error processing notification event [${topic}]: ${err.message}`);
        }
      },
    });
  }

  private async handleEvent(topic: string, event: IBankingEvent) {
    switch (topic) {
      case KafkaTopics.MONEY_DEPOSITED: {
        const p = event.payload as IMoneyDepositedPayload;
        const amount = (p.amountMinor / 100).toFixed(2);
        await this.createNotification({
          userId: p.userId,
          type: NotificationTypeEnum.TRANSACTION,
          title: '💰 Money Deposited',
          body: `₹${amount} has been credited to your account ${p.accountNumber || p.accountId}.`,
          metadata: { transactionId: p.transactionId, amountMinor: p.amountMinor },
        });
        break;
      }

      case KafkaTopics.MONEY_WITHDRAWN: {
        const p = event.payload as IMoneyWithdrawnPayload;
        const amount = (p.amountMinor / 100).toFixed(2);
        await this.createNotification({
          userId: p.userId,
          type: NotificationTypeEnum.TRANSACTION,
          title: '💸 Money Withdrawn',
          body: `₹${amount} has been debited from your account ${p.accountNumber || p.accountId}.`,
          metadata: { transactionId: p.transactionId, amountMinor: p.amountMinor },
        });
        break;
      }

      case KafkaTopics.MONEY_TRANSFERRED: {
        const p = event.payload as IMoneyTransferredPayload;
        const amount = (p.amountMinor / 100).toFixed(2);
        await this.createNotification({
          userId: p.userId,
          type: NotificationTypeEnum.TRANSACTION,
          title: '🔄 Transfer Successful',
          body: `₹${amount} transferred from ${p.sourceAccountNumber} to ${p.destinationAccountNumber}.`,
          metadata: { transactionId: p.transactionId, amountMinor: p.amountMinor },
        });
        break;
      }

      case KafkaTopics.ACCOUNT_CREATED: {
        const p = event.payload as IAccountCreatedPayload;
        await this.createNotification({
          userId: p.userId,
          type: NotificationTypeEnum.ACCOUNT,
          title: '🏦 Account Created',
          body: `Your ${p.type} account (${p.accountNumber}) has been successfully created.`,
          metadata: { accountId: p.accountId, accountNumber: p.accountNumber },
        });
        break;
      }

      case KafkaTopics.PAYMENT_COMPLETED: {
        const p = event.payload as any;
        const amount = (p.amountMinor / 100).toFixed(2);
        await this.createNotification({
          userId: p.userId,
          type: NotificationTypeEnum.PAYMENT,
          title: '✅ Payment Successful',
          body: `Your ${p.method} payment of ₹${amount} was completed.`,
          metadata: { paymentId: p.paymentId, amountMinor: p.amountMinor },
        });
        break;
      }

      case KafkaTopics.PAYMENT_FAILED: {
        const p = event.payload as any;
        await this.createNotification({
          userId: p.userId,
          type: NotificationTypeEnum.PAYMENT,
          title: '❌ Payment Failed',
          body: `Your payment failed: ${p.failureReason || 'Unknown error'}.`,
          metadata: { paymentId: p.paymentId },
        });
        break;
      }

      default:
        this.logger.warn(`Unknown topic for notification: ${topic}`);
    }
  }

  // ─── Internal Helper ──────────────────────────────────────────────────────

  async createNotification(data: {
    userId: string;
    type: NotificationTypeEnum;
    title: string;
    body: string;
    metadata?: Record<string, any>;
  }): Promise<NotificationDocument> {
    const notification = await this.notificationModel.create(data);
    this.logger.info(`Created notification [${data.type}] for user ${data.userId}: ${data.title}`);
    return notification;
  }

  // ─── REST Handlers ────────────────────────────────────────────────────────

  async getNotifications(
    userId: string,
    opts: { unreadOnly?: boolean; page?: number; limit?: number },
  ): Promise<{ data: NotificationDocument[]; total: number; unreadCount: number; pages: number }> {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(100, opts.limit || 20);
    const skip = (page - 1) * limit;

    const filter: any = { userId };
    if (opts.unreadOnly) filter.read = false;

    const [data, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(filter).exec(),
      this.notificationModel.countDocuments({ userId, read: false }).exec(),
    ]);

    return { data, total, unreadCount, pages: Math.ceil(total / limit) || 1 };
  }

  async markAsRead(id: string, userId: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: id, userId },
      { read: true },
      { new: true },
    ).exec();

    if (!notification) {
      throw new NotFoundException(`Notification '${id}' not found`);
    }

    return notification;
  }

  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel
      .updateMany({ userId, read: false }, { read: true })
      .exec();
    return { modifiedCount: result.modifiedCount };
  }

  async deleteNotification(id: string, userId: string): Promise<{ message: string }> {
    const notification = await this.notificationModel
      .findOneAndDelete({ _id: id, userId })
      .exec();

    if (!notification) {
      throw new NotFoundException(`Notification '${id}' not found`);
    }

    return { message: 'Notification deleted' };
  }
}
