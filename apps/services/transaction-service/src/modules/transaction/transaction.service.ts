import { observeOperation, businessRejection } from "@banking/observability";
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, isValidObjectId } from "mongoose";
import { Transaction, TransactionDocument } from "./schemas/transaction.schema";
import { DepositDto } from "./dto/deposit.dto";
import { WithdrawDto } from "./dto/withdraw.dto";
import { TransferDto } from "./dto/transfer.dto";
import { QueryTransactionsDto } from "./dto/query-transactions.dto";
import { IdempotencyService } from "./services/idempotency.service";
import { OutboxService } from "./services/outbox.service";
import {
  TransactionType,
  TransactionStatus,
  KafkaTopics,
  IMoneyDepositedPayload,
  IMoneyWithdrawnPayload,
  IMoneyTransferredPayload,
} from "@banking/shared-types";
import { appConfig } from "@banking/config";
import { createLogger } from "@banking/logger";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

@Injectable()
export class TransactionService {
  private logger = createLogger("TransactionService");
  private accountServiceBaseUrl = `http://localhost:${appConfig.ports.account || 4003}/api/v1/accounts`;

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    private idempotencyService: IdempotencyService,
    private outboxService: OutboxService,
  ) {}

  private generateTransactionId(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = uuidv4().substring(0, 8).toUpperCase();
    return `TXN-${dateStr}-${randomHex}`;
  }

  /**
   * Helper to execute balance mutations via internal account-service API
   */
  private async mutateAccountBalance(
    accountId: string,
    amountMinor: number,
    operation: "CREDIT" | "DEBIT",
    description?: string,
    transactionId?: string,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.accountServiceBaseUrl}/internal/mutate-balance`,
        {
          accountId,
          amountMinor,
          operation,
          description,
          transactionId,
        },
        { timeout: 8000 },
      );
      return response.data;
    } catch (err: any) {
      const errResponse = err.response?.data;
      const status = err.response?.status || 500;
      const msg =
        errResponse?.message || err.message || "Balance mutation failed";

      if (status === 404) {
        throw businessRejection(
          new NotFoundException(`Account '${accountId}' not found`),
        );
      }
      if (status === 400) {
        const error = new BadRequestException(
          errResponse || { code: "BAD_REQUEST", message: msg },
        );
        throw [
          "INSUFFICIENT_FUNDS",
          "ACCOUNT_FROZEN",
          "LIMIT_EXCEEDED",
        ].includes(errResponse?.code)
          ? businessRejection(error)
          : error;
      }
      throw new InternalServerErrorException(
        `Account service communication error: ${msg}`,
      );
    }
  }

  /**
   * Fetch account details to verify existence & ownership
   */
  private async fetchAccount(accountIdOrNumber: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.accountServiceBaseUrl}/${accountIdOrNumber}`,
        { timeout: 5000 },
      );
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        throw businessRejection(
          new NotFoundException(`Account '${accountIdOrNumber}' not found`),
        );
      }
      throw new InternalServerErrorException(
        err.response?.data?.message ||
          `Could not retrieve account '${accountIdOrNumber}'`,
      );
    }
  }

  /**
   * Deposit Money
   */
  async deposit(
    userId: string,
    dto: DepositDto,
    idempotencyKey?: string,
  ): Promise<TransactionDocument> {
    const key = idempotencyKey || uuidv4();

    // 1. Idempotency check
    const cached = await this.idempotencyService
      .getStoredResponse(userId, key)
      .catch((error) =>
        observeOperation(
          "transaction-service",
          "transaction",
          "deposit",
          async () => {
            throw error;
          },
        ),
      );
    if (cached) return cached;

    return observeOperation(
      "transaction-service",
      "transaction",
      "deposit",
      async () => {
        const transactionId = this.generateTransactionId();

        // 2. Create PENDING transaction
        const transaction = await this.transactionModel.create({
          transactionId,
          userId,
          accountId: dto.accountId,
          type: TransactionType.DEPOSIT,
          amountMinor: dto.amountMinor,
          currency: "INR",
          description: dto.description || "Cash / Online Deposit",
          status: TransactionStatus.PENDING,
          idempotencyKey: key,
        });

        try {
          // 3. Mutate Account Balance (CREDIT)
          const updatedAccount = await this.mutateAccountBalance(
            dto.accountId,
            dto.amountMinor,
            "CREDIT",
            dto.description,
            transactionId,
          );

          // 4. Mark transaction COMPLETED
          transaction.status = TransactionStatus.COMPLETED;
          transaction.accountId = updatedAccount.accountNumber || dto.accountId;
          await transaction.save();

          this.logger.info(
            `Deposit completed: ${transactionId} -> ${dto.amountMinor} paise`,
          );

          // 5. Outbox Event & Kafka dispatch
          const eventPayload: IMoneyDepositedPayload = {
            transactionId,
            accountId: updatedAccount._id || dto.accountId,
            accountNumber: updatedAccount.accountNumber,
            userId,
            amountMinor: dto.amountMinor,
            currency: "INR",
            occurredAt: new Date().toISOString(),
          };

          await this.outboxService.saveAndPublishEvent(
            KafkaTopics.MONEY_DEPOSITED,
            "MoneyDeposited",
            transactionId,
            eventPayload,
          );

          // 6. Store Idempotency Response
          await this.idempotencyService.storeResponse(
            userId,
            key,
            transactionId,
            transaction,
          );

          return transaction;
        } catch (err: any) {
          transaction.status = TransactionStatus.FAILED;
          transaction.failureReason =
            err.message || "Deposit processing failed";
          await transaction.save();
          throw err;
        }
      },
    );
  }

  /**
   * Withdraw Money
   */
  async withdraw(
    userId: string,
    dto: WithdrawDto,
    idempotencyKey?: string,
  ): Promise<TransactionDocument> {
    const key = idempotencyKey || uuidv4();

    // 1. Idempotency check
    const cached = await this.idempotencyService
      .getStoredResponse(userId, key)
      .catch((error) =>
        observeOperation(
          "transaction-service",
          "transaction",
          "withdraw",
          async () => {
            throw error;
          },
        ),
      );
    if (cached) return cached;

    return observeOperation(
      "transaction-service",
      "transaction",
      "withdraw",
      async () => {
        // 2. Verify account ownership
        const account = await this.fetchAccount(dto.accountId);
        if (account.userId && account.userId !== userId) {
          throw businessRejection(
            new ForbiddenException(
              "You do not have permission to withdraw from this account",
            ),
          );
        }

        const transactionId = this.generateTransactionId();

        // 3. Create PENDING transaction
        const transaction = await this.transactionModel.create({
          transactionId,
          userId,
          accountId: account.accountNumber || dto.accountId,
          type: TransactionType.WITHDRAWAL,
          amountMinor: dto.amountMinor,
          currency: "INR",
          description: dto.description || "ATM / Cash Withdrawal",
          status: TransactionStatus.PENDING,
          idempotencyKey: key,
        });

        try {
          // 4. Mutate Account Balance (DEBIT)
          const updatedAccount = await this.mutateAccountBalance(
            dto.accountId,
            dto.amountMinor,
            "DEBIT",
            dto.description,
            transactionId,
          );

          // 5. Mark transaction COMPLETED
          transaction.status = TransactionStatus.COMPLETED;
          await transaction.save();

          this.logger.info(
            `Withdrawal completed: ${transactionId} -> ${dto.amountMinor} paise`,
          );

          // 6. Outbox Event & Kafka dispatch
          const eventPayload: IMoneyWithdrawnPayload = {
            transactionId,
            accountId: updatedAccount._id || dto.accountId,
            accountNumber: updatedAccount.accountNumber,
            userId,
            amountMinor: dto.amountMinor,
            currency: "INR",
            occurredAt: new Date().toISOString(),
          };

          await this.outboxService.saveAndPublishEvent(
            KafkaTopics.MONEY_WITHDRAWN,
            "MoneyWithdrawn",
            transactionId,
            eventPayload,
          );

          // 7. Store Idempotency Response
          await this.idempotencyService.storeResponse(
            userId,
            key,
            transactionId,
            transaction,
          );

          return transaction;
        } catch (err: any) {
          transaction.status = TransactionStatus.FAILED;
          transaction.failureReason =
            err.message || "Withdrawal processing failed";
          await transaction.save();
          throw err;
        }
      },
    );
  }

  /**
   * Transfer Money
   */
  async transfer(
    userId: string,
    dto: TransferDto,
    idempotencyKey?: string,
  ): Promise<TransactionDocument> {
    const key = idempotencyKey || uuidv4();

    // 1. Idempotency check
    const cached = await this.idempotencyService
      .getStoredResponse(userId, key)
      .catch((error) =>
        observeOperation(
          "transaction-service",
          "transaction",
          "transfer",
          async () => {
            throw error;
          },
        ),
      );
    if (cached) return cached;

    return observeOperation(
      "transaction-service",
      "transaction",
      "transfer",
      async () => {
        // 2. Reject same-account transfer
        if (
          dto.sourceAccountId.trim().toUpperCase() ===
          dto.destinationAccountId.trim().toUpperCase()
        ) {
          throw businessRejection(
            new BadRequestException({
              code: "INVALID_TRANSFER",
              message: "Source and destination accounts must be different",
            }),
          );
        }

        // 3. Verify source account ownership
        const sourceAccount = await this.fetchAccount(dto.sourceAccountId);
        if (sourceAccount.userId && sourceAccount.userId !== userId) {
          throw businessRejection(
            new ForbiddenException(
              "You do not have permission to transfer from this source account",
            ),
          );
        }

        // 4. Verify destination account exists
        const destAccount = await this.fetchAccount(dto.destinationAccountId);

        const transactionId = this.generateTransactionId();

        // 5. Create PENDING transaction
        const transaction = await this.transactionModel.create({
          transactionId,
          userId,
          accountId: sourceAccount.accountNumber || dto.sourceAccountId,
          destinationAccountId:
            destAccount.accountNumber || dto.destinationAccountId,
          type: TransactionType.TRANSFER,
          amountMinor: dto.amountMinor,
          currency: "INR",
          description:
            dto.description || `Transfer to ${destAccount.accountNumber}`,
          status: TransactionStatus.PENDING,
          idempotencyKey: key,
        });

        try {
          // 6. Step 1: Atomic Debit from Source Account
          await this.mutateAccountBalance(
            dto.sourceAccountId,
            dto.amountMinor,
            "DEBIT",
            `Transfer to ${destAccount.accountNumber}`,
            transactionId,
          );

          // 7. Step 2: Atomic Credit to Destination Account
          try {
            await this.mutateAccountBalance(
              dto.destinationAccountId,
              dto.amountMinor,
              "CREDIT",
              `Transfer from ${sourceAccount.accountNumber}`,
              transactionId,
            );
          } catch (creditErr: any) {
            // Rollback debit on destination failure
            this.logger.error(
              `Destination credit failed for transfer ${transactionId}. Rolling back debit...`,
            );
            await this.mutateAccountBalance(
              dto.sourceAccountId,
              dto.amountMinor,
              "CREDIT",
              `Rollback: Transfer ${transactionId} failed`,
              transactionId,
            );
            throw new InternalServerErrorException(
              "Transfer credit failed after debit; compensation attempted",
            );
          }

          // 8. Mark transaction COMPLETED
          transaction.status = TransactionStatus.COMPLETED;
          await transaction.save();

          this.logger.info(
            `Transfer completed: ${transactionId} -> ${dto.amountMinor} paise from ${sourceAccount.accountNumber} to ${destAccount.accountNumber}`,
          );

          // 9. Outbox Event & Kafka dispatch
          const eventPayload: IMoneyTransferredPayload = {
            transactionId,
            sourceAccountId: sourceAccount._id || dto.sourceAccountId,
            sourceAccountNumber: sourceAccount.accountNumber,
            destinationAccountId: destAccount._id || dto.destinationAccountId,
            destinationAccountNumber: destAccount.accountNumber,
            userId,
            amountMinor: dto.amountMinor,
            currency: "INR",
            occurredAt: new Date().toISOString(),
          };

          await this.outboxService.saveAndPublishEvent(
            KafkaTopics.MONEY_TRANSFERRED,
            "MoneyTransferred",
            transactionId,
            eventPayload,
          );

          // 10. Store Idempotency Response
          await this.idempotencyService.storeResponse(
            userId,
            key,
            transactionId,
            transaction,
          );

          return transaction;
        } catch (err: any) {
          transaction.status = TransactionStatus.FAILED;
          transaction.failureReason =
            err.message || "Transfer processing failed";
          await transaction.save();
          throw err;
        }
      },
    );
  }

  /**
   * Get filtered & paginated transactions
   */
  async getTransactions(
    userId: string,
    query: QueryTransactionsDto,
  ): Promise<{ data: TransactionDocument[]; pagination: any }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = { userId };

    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;

    if (query.accountId) {
      filter.$or = [
        { accountId: query.accountId },
        { destinationAccountId: query.accountId },
      ];
    }

    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) filter.createdAt.$gte = new Date(query.from);
      if (query.to) filter.createdAt.$lte = new Date(query.to);
    }

    const [data, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transactionModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single transaction by ID or transactionId
   */
  async getTransactionById(
    idOrTxnId: string,
    userId?: string,
  ): Promise<TransactionDocument> {
    const query: any = {};
    if (isValidObjectId(idOrTxnId)) {
      query.$or = [{ _id: idOrTxnId }, { transactionId: idOrTxnId }];
    } else {
      query.transactionId = idOrTxnId;
    }

    const transaction = await this.transactionModel.findOne(query).exec();
    if (!transaction) {
      throw new NotFoundException(`Transaction '${idOrTxnId}' not found`);
    }

    if (userId && transaction.userId !== userId) {
      throw new ForbiddenException(
        "You do not have permission to view this transaction",
      );
    }

    return transaction;
  }
}
