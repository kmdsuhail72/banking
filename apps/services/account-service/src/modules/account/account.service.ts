import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, isValidObjectId } from "mongoose";
import { Account, AccountDocument } from "./schemas/account.schema";
import { CreateAccountDto } from "./dto/create-account.dto";
import { MutateBalanceDto } from "./dto/mutate-balance.dto";
import {
  AccountType,
  AccountStatus,
  KafkaTopics,
  IAccountCreatedPayload,
} from "@banking/shared-types";
import { generateAccountNumber } from "./utils/account-number";
import { KafkaEventBus } from "@banking/kafka";
import { createLogger } from "@banking/logger";
import { appConfig } from "@banking/config";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class AccountService {
  private logger = createLogger("AccountService");
  private eventBus = new KafkaEventBus({
    clientId: "account-service",
    brokers: appConfig.kafka.brokers,
  });

  constructor(
    @InjectModel(Account.name)
    private accountModel: Model<AccountDocument>,
  ) {}

  async onModuleInit() {
    try {
      await this.eventBus.getProducer();
      this.logger.info("AccountService Kafka producer connected");
    } catch (err: any) {
      this.logger.warn(`Kafka producer connection warning: ${err.message}`);
    }
  }

  async createAccount(
    userId: string,
    dto: CreateAccountDto,
  ): Promise<AccountDocument> {
    const existing = await this.accountModel.findOne({
      userId,
      type: dto.type,
      status: { $ne: AccountStatus.CLOSED },
    });

    if (existing) {
      throw new ConflictException(
        `An active ${dto.type} account already exists for this user`,
      );
    }

    let accountNumber = generateAccountNumber(dto.type);
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      const collision = await this.accountModel.findOne({ accountNumber });
      if (!collision) {
        isUnique = true;
      } else {
        accountNumber = generateAccountNumber(dto.type);
        attempts++;
      }
    }

    const account = await this.accountModel.create({
      accountNumber,
      userId,
      type: dto.type,
      currency: dto.currency || "INR",
      balanceMinor: 0,
      availableBalanceMinor: 0,
      status: AccountStatus.ACTIVE,
    });

    this.logger.info(
      `Created ${dto.type} account ${account.accountNumber} for user ${userId}`,
    );

    // Publish account.created event
    try {
      const eventPayload: IAccountCreatedPayload = {
        accountId: account._id.toString(),
        accountNumber: account.accountNumber,
        userId: account.userId,
        type: account.type,
        currency: account.currency,
        createdAt:
          (account as any).createdAt?.toISOString() || new Date().toISOString(),
      };

      await this.eventBus.publish(KafkaTopics.ACCOUNT_CREATED, {
        eventId: uuidv4(),
        eventType: "AccountCreated",
        version: 1,
        occurredAt: new Date().toISOString(),
        payload: eventPayload,
      });
    } catch (err: any) {
      this.logger.warn(
        `Could not dispatch account.created event: ${err.message}`,
      );
    }

    return account;
  }

  async getAccountsForUser(userId: string): Promise<AccountDocument[]> {
    return this.accountModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async getAccountById(
    accountIdOrNumber: string,
    userId?: string,
  ): Promise<AccountDocument> {
    const query: any = {};
    if (isValidObjectId(accountIdOrNumber)) {
      query.$or = [
        { _id: accountIdOrNumber },
        { accountNumber: accountIdOrNumber },
      ];
    } else {
      query.accountNumber = accountIdOrNumber;
    }

    const account = await this.accountModel.findOne(query).exec();
    if (!account) {
      throw new NotFoundException(`Account '${accountIdOrNumber}' not found`);
    }

    if (userId && account.userId !== userId) {
      throw new ForbiddenException(
        "You do not have permission to access this account",
      );
    }

    return account;
  }

  async getAccountBalance(accountIdOrNumber: string, userId: string) {
    const account = await this.getAccountById(accountIdOrNumber, userId);
    return {
      id: account._id,
      accountNumber: account.accountNumber,
      currency: account.currency,
      balanceMinor: account.balanceMinor,
      availableBalanceMinor: account.availableBalanceMinor,
      balanceFormatted: (account.balanceMinor / 100).toFixed(2),
      status: account.status,
    };
  }

  async updateAccountStatus(
    accountIdOrNumber: string,
    newStatus: AccountStatus,
    userId?: string,
  ): Promise<AccountDocument> {
    const account = await this.getAccountById(accountIdOrNumber, userId);

    if (
      account.status === AccountStatus.CLOSED &&
      newStatus === AccountStatus.ACTIVE
    ) {
      throw new BadRequestException(
        "Cannot reactivate a permanently closed account",
      );
    }

    const previousStatus = account.status;
    account.status = newStatus;
    await account.save();

    this.logger.info(
      `Account ${account.accountNumber} status updated to ${newStatus}`,
    );

    // Publish account.closed event for downstream services
    if (
      newStatus === AccountStatus.CLOSED &&
      previousStatus !== AccountStatus.CLOSED
    ) {
      try {
        await this.eventBus.publish(KafkaTopics.ACCOUNT_CREATED, {
          eventId: uuidv4(),
          eventType: "AccountClosed",
          version: 1,
          occurredAt: new Date().toISOString(),
          payload: {
            accountId: account._id.toString(),
            accountNumber: account.accountNumber,
            userId: account.userId,
            type: account.type,
            currency: account.currency,
            closedAt: new Date().toISOString(),
          },
        });
      } catch (err: any) {
        this.logger.warn(
          `Could not dispatch account.closed event: ${err.message}`,
        );
      }
    }

    return account;
  }

  /**
   * Atomic balance mutation for deposits, withdrawals, and transfers
   */
  async mutateBalance(dto: MutateBalanceDto): Promise<AccountDocument> {
    const query: any = { status: AccountStatus.ACTIVE };

    if (isValidObjectId(dto.accountId)) {
      query.$or = [{ _id: dto.accountId }, { accountNumber: dto.accountId }];
    } else {
      query.accountNumber = dto.accountId;
    }

    if (dto.operation === "DEBIT") {
      // Ensure sufficient balance atomically
      query.availableBalanceMinor = { $gte: dto.amountMinor };

      const updated = await this.accountModel
        .findOneAndUpdate(
          query,
          {
            $inc: {
              balanceMinor: -dto.amountMinor,
              availableBalanceMinor: -dto.amountMinor,
            },
          },
          { new: true },
        )
        .exec();

      if (!updated) {
        // Inspect failure reason
        const exists = await this.accountModel.findOne(
          isValidObjectId(dto.accountId)
            ? {
                $or: [{ _id: dto.accountId }, { accountNumber: dto.accountId }],
              }
            : { accountNumber: dto.accountId },
        );

        if (!exists) {
          throw new NotFoundException(`Account '${dto.accountId}' not found`);
        }
        if (exists.status !== AccountStatus.ACTIVE) {
          throw new BadRequestException(
            `Account '${exists.accountNumber}' is ${exists.status} and cannot transact`,
          );
        }
        throw new BadRequestException({
          code: "INSUFFICIENT_FUNDS",
          message: "Insufficient account balance",
        });
      }

      this.logger.info(
        `Debited ${dto.amountMinor} paise from account ${updated.accountNumber}. New balance: ${updated.balanceMinor}`,
      );

      return updated;
    } else {
      // CREDIT
      const updated = await this.accountModel
        .findOneAndUpdate(
          query,
          {
            $inc: {
              balanceMinor: dto.amountMinor,
              availableBalanceMinor: dto.amountMinor,
            },
          },
          { new: true },
        )
        .exec();

      if (!updated) {
        const exists = await this.accountModel.findOne(
          isValidObjectId(dto.accountId)
            ? {
                $or: [{ _id: dto.accountId }, { accountNumber: dto.accountId }],
              }
            : { accountNumber: dto.accountId },
        );

        if (!exists) {
          throw new NotFoundException(`Account '${dto.accountId}' not found`);
        }
        throw new BadRequestException(
          `Account '${exists.accountNumber}' is ${exists.status} and cannot transact`,
        );
      }

      this.logger.info(
        `Credited ${dto.amountMinor} paise to account ${updated.accountNumber}. New balance: ${updated.balanceMinor}`,
      );

      return updated;
    }
  }

  /**
   * Admin: list all accounts with pagination
   */
  async getAllAccounts(
    page = 1,
    limit = 20,
  ): Promise<{ accounts: AccountDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    const [accounts, total] = await Promise.all([
      this.accountModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.accountModel.countDocuments().exec(),
    ]);
    return { accounts, total, pages: Math.ceil(total / limit) };
  }
}
