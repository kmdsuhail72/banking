import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, isValidObjectId } from "mongoose";
import { Beneficiary, BeneficiaryDocument } from "./schemas/beneficiary.schema";
import { CreateBeneficiaryDto } from "./dto/create-beneficiary.dto";
import { UpdateBeneficiaryDto } from "./dto/update-beneficiary.dto";
import { KafkaEventBus } from "@banking/kafka";
import { createLogger } from "@banking/logger";
import { appConfig } from "@banking/config";
import {
  KafkaTopics,
  IBeneficiaryAddedPayload,
  IBeneficiaryRemovedPayload,
} from "@banking/shared-types";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class BeneficiaryService {
  private logger = createLogger("BeneficiaryService");
  private eventBus = new KafkaEventBus({
    clientId: "beneficiary-service",
    brokers: appConfig.kafka.brokers,
  });

  constructor(
    @InjectModel(Beneficiary.name)
    private beneficiaryModel: Model<BeneficiaryDocument>,
  ) {}

  async onModuleInit() {
    try {
      await this.eventBus.getProducer();
      this.logger.info("BeneficiaryService Kafka producer connected");
    } catch (err: any) {
      this.logger.warn(`Kafka producer connection warning: ${err.message}`);
    }
  }

  /**
   * Add a new beneficiary for the authenticated user
   */
  async addBeneficiary(
    userId: string,
    dto: CreateBeneficiaryDto,
  ): Promise<BeneficiaryDocument> {
    const existing = await this.beneficiaryModel.findOne({
      userId,
      accountNumber: dto.accountNumber.toUpperCase(),
    });

    if (existing) {
      throw new ConflictException(
        `Beneficiary with account number '${dto.accountNumber}' already exists`,
      );
    }

    const beneficiary = await this.beneficiaryModel.create({
      userId,
      name: dto.name,
      accountNumber: dto.accountNumber.toUpperCase(),
      bankName: dto.bankName,
      ifscCode: dto.ifscCode?.toUpperCase(),
      nickname: dto.nickname,
      isVerified: false,
    });

    this.logger.info(
      `Added beneficiary ${beneficiary.accountNumber} for user ${userId}`,
    );

    // Publish event
    try {
      const payload: IBeneficiaryAddedPayload = {
        beneficiaryId: (beneficiary as any)._id.toString(),
        userId,
        accountNumber: beneficiary.accountNumber,
        name: beneficiary.name,
        addedAt: new Date().toISOString(),
      };
      await this.eventBus.publish(KafkaTopics.BENEFICIARY_ADDED, {
        eventId: uuidv4(),
        eventType: "BeneficiaryAdded",
        version: 1,
        occurredAt: new Date().toISOString(),
        payload,
      });
    } catch (err: any) {
      this.logger.warn(
        `Could not dispatch beneficiary.added event: ${err.message}`,
      );
    }

    return beneficiary;
  }

  /**
   * List all beneficiaries for the authenticated user
   */
  async getBeneficiaries(userId: string): Promise<BeneficiaryDocument[]> {
    return this.beneficiaryModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get a single beneficiary by ID, verifying ownership
   */
  async getBeneficiaryById(
    id: string,
    userId: string,
  ): Promise<BeneficiaryDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`Beneficiary '${id}' not found`);
    }

    const beneficiary = await this.beneficiaryModel.findById(id).exec();
    if (!beneficiary) {
      throw new NotFoundException(`Beneficiary '${id}' not found`);
    }

    if (beneficiary.userId !== userId) {
      throw new ForbiddenException(
        "You do not have access to this beneficiary",
      );
    }

    return beneficiary;
  }

  /**
   * Update nickname / bank details
   */
  async updateBeneficiary(
    id: string,
    userId: string,
    dto: UpdateBeneficiaryDto,
  ): Promise<BeneficiaryDocument> {
    const beneficiary = await this.getBeneficiaryById(id, userId);

    if (dto.nickname !== undefined) beneficiary.nickname = dto.nickname;
    if (dto.bankName !== undefined) beneficiary.bankName = dto.bankName;
    if (dto.ifscCode !== undefined)
      beneficiary.ifscCode = dto.ifscCode.toUpperCase();

    await beneficiary.save();
    this.logger.info(`Updated beneficiary ${id} for user ${userId}`);
    return beneficiary;
  }

  /**
   * Remove a beneficiary
   */
  async removeBeneficiary(
    id: string,
    userId: string,
  ): Promise<{ message: string }> {
    const beneficiary = await this.getBeneficiaryById(id, userId);

    const accountNumber = beneficiary.accountNumber;
    await this.beneficiaryModel.findByIdAndDelete(id).exec();

    this.logger.info(
      `Removed beneficiary ${accountNumber} (${id}) for user ${userId}`,
    );

    // Publish event
    try {
      const payload: IBeneficiaryRemovedPayload = {
        beneficiaryId: id,
        userId,
        accountNumber,
        removedAt: new Date().toISOString(),
      };
      await this.eventBus.publish(KafkaTopics.BENEFICIARY_REMOVED, {
        eventId: uuidv4(),
        eventType: "BeneficiaryRemoved",
        version: 1,
        occurredAt: new Date().toISOString(),
        payload,
      });
    } catch (err: any) {
      this.logger.warn(
        `Could not dispatch beneficiary.removed event: ${err.message}`,
      );
    }

    return { message: "Beneficiary removed successfully" };
  }

  /**
   * Mark a beneficiary as verified (admin / internal use)
   */
  async verifyBeneficiary(id: string): Promise<BeneficiaryDocument> {
    const beneficiary = await this.beneficiaryModel
      .findByIdAndUpdate(id, { isVerified: true }, { new: true })
      .exec();

    if (!beneficiary) {
      throw new NotFoundException(`Beneficiary '${id}' not found`);
    }

    this.logger.info(`Beneficiary ${id} marked as verified`);
    return beneficiary;
  }
}
