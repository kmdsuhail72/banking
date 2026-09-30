import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  LedgerEntry,
  LedgerEntryDocument,
} from "./schemas/ledger-entry.schema";
import { KafkaEventBus } from "@banking/kafka";
import { createLogger } from "@banking/logger";
import { appConfig } from "@banking/config";
import {
  KafkaTopics,
  IMoneyDepositedPayload,
  IMoneyWithdrawnPayload,
  IMoneyTransferredPayload,
  IBankingEvent,
} from "@banking/shared-types";

@Injectable()
export class LedgerService {
  private logger = createLogger("LedgerService");
  private eventBus = new KafkaEventBus({
    clientId: "ledger-service",
    brokers: appConfig.kafka.brokers,
  });

  constructor(
    @InjectModel(LedgerEntry.name)
    private ledgerModel: Model<LedgerEntryDocument>,
  ) {}

  async onModuleInit() {
    try {
      await this.startKafkaConsumer();
      this.logger.info("LedgerService Kafka consumer started");
    } catch (err: any) {
      this.logger.warn(`Kafka consumer startup warning: ${err.message}`);
    }
  }

  // ─── Kafka Consumer ───────────────────────────────────────────────────────

  private async startKafkaConsumer() {
    const consumer = await this.eventBus.getConsumer("ledger-service-group");

    const topics = [
      KafkaTopics.MONEY_DEPOSITED,
      KafkaTopics.MONEY_WITHDRAWN,
      KafkaTopics.MONEY_TRANSFERRED,
    ];

    await consumer.subscribe({ topics, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          const raw = message.value?.toString();
          if (!raw) return;
          const event: IBankingEvent = JSON.parse(raw);
          await this.recordEvent(topic, event);
        } catch (err: any) {
          if (err.code === 11000) {
            // Duplicate key — idempotent, already recorded
            this.logger.warn(
              `Duplicate ledger entry skipped for topic [${topic}]`,
            );
            return;
          }
          this.logger.error(
            `Error recording ledger entry [${topic}]: ${err.message}`,
          );
        }
      },
    });
  }

  private async recordEvent(topic: string, event: IBankingEvent) {
    const occurredAt = new Date(event.occurredAt || Date.now());

    switch (topic) {
      case KafkaTopics.MONEY_DEPOSITED: {
        // One CREDIT entry
        const p = event.payload as IMoneyDepositedPayload;
        await this.ledgerModel.create({
          transactionId: p.transactionId,
          accountNumber: p.accountNumber || p.accountId,
          entryType: "CREDIT",
          amountMinor: p.amountMinor,
          currency: p.currency,
          balanceAfterMinor: 0, // Will be updated by balance queries; placeholder
          description: "Deposit",
          occurredAt,
        });
        this.logger.info(
          `Ledger CREDIT recorded for deposit ${p.transactionId}`,
        );
        break;
      }

      case KafkaTopics.MONEY_WITHDRAWN: {
        // One DEBIT entry
        const p = event.payload as IMoneyWithdrawnPayload;
        await this.ledgerModel.create({
          transactionId: p.transactionId,
          accountNumber: p.accountNumber || p.accountId,
          entryType: "DEBIT",
          amountMinor: p.amountMinor,
          currency: p.currency,
          balanceAfterMinor: 0,
          description: "Withdrawal",
          occurredAt,
        });
        this.logger.info(
          `Ledger DEBIT recorded for withdrawal ${p.transactionId}`,
        );
        break;
      }

      case KafkaTopics.MONEY_TRANSFERRED: {
        // Two entries: DEBIT from source, CREDIT to destination
        const p = event.payload as IMoneyTransferredPayload;
        await Promise.all([
          this.ledgerModel.create({
            transactionId: `${p.transactionId}-SRC`,
            accountNumber: p.sourceAccountNumber || p.sourceAccountId,
            entryType: "DEBIT",
            amountMinor: p.amountMinor,
            currency: p.currency,
            balanceAfterMinor: 0,
            description: `Transfer to ${p.destinationAccountNumber}`,
            occurredAt,
          }),
          this.ledgerModel.create({
            transactionId: `${p.transactionId}-DST`,
            accountNumber: p.destinationAccountNumber || p.destinationAccountId,
            entryType: "CREDIT",
            amountMinor: p.amountMinor,
            currency: p.currency,
            balanceAfterMinor: 0,
            description: `Transfer from ${p.sourceAccountNumber}`,
            occurredAt,
          }),
        ]);
        this.logger.info(
          `Ledger DEBIT+CREDIT recorded for transfer ${p.transactionId}`,
        );
        break;
      }

      default:
        this.logger.warn(`Unknown topic for ledger: ${topic}`);
    }
  }

  // ─── REST Handlers ────────────────────────────────────────────────────────

  /**
   * Get paginated ledger entries for an account number
   */
  async getEntriesByAccount(
    accountNumber: string,
    opts: { page?: number; limit?: number; from?: string; to?: string },
  ): Promise<{
    data: LedgerEntryDocument[];
    total: number;
    pages: number;
    creditTotal: number;
    debitTotal: number;
  }> {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(100, opts.limit || 20);
    const skip = (page - 1) * limit;

    const filter: any = { accountNumber };
    if (opts.from || opts.to) {
      filter.occurredAt = {};
      if (opts.from) filter.occurredAt.$gte = new Date(opts.from);
      if (opts.to) filter.occurredAt.$lte = new Date(opts.to);
    }

    const [data, total, aggregation] = await Promise.all([
      this.ledgerModel
        .find(filter)
        .sort({ occurredAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.ledgerModel.countDocuments(filter).exec(),
      this.ledgerModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$entryType",
            total: { $sum: "$amountMinor" },
          },
        },
      ]),
    ]);

    const creditTotal =
      aggregation.find((a: any) => a._id === "CREDIT")?.total || 0;
    const debitTotal =
      aggregation.find((a: any) => a._id === "DEBIT")?.total || 0;

    return {
      data,
      total,
      pages: Math.ceil(total / limit) || 1,
      creditTotal,
      debitTotal,
    };
  }

  /**
   * Get a specific ledger entry by ID
   */
  async getEntryById(id: string): Promise<LedgerEntryDocument> {
    const entry = await this.ledgerModel.findById(id).exec();
    if (!entry) throw new NotFoundException(`Ledger entry '${id}' not found`);
    return entry;
  }

  /**
   * Get all entries for a transaction (e.g. both legs of a transfer)
   */
  async getEntriesByTransaction(
    transactionId: string,
  ): Promise<LedgerEntryDocument[]> {
    return this.ledgerModel
      .find({
        $or: [
          { transactionId },
          { transactionId: `${transactionId}-SRC` },
          { transactionId: `${transactionId}-DST` },
        ],
      })
      .sort({ occurredAt: 1 })
      .exec();
  }
}
