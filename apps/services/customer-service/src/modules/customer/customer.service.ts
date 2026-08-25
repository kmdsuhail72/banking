import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from '../../schemas/customer.schema';
import { appConfig } from '@banking/config';
import { createLogger } from '@banking/logger';
import { KafkaEventBus } from '@banking/kafka';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  SubmitKycDto,
  KycStatus,
  KafkaTopics,
  ICustomerCreatedPayload,
} from '@banking/shared-types';

@Injectable()
export class CustomerService {
  private logger = createLogger('CustomerService');
  private eventBus = new KafkaEventBus({
    clientId: 'customer-service',
    brokers: appConfig.kafka.brokers,
  });

  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {}

  async createCustomer(dto: CreateCustomerDto): Promise<CustomerDocument> {
    const existing = await this.customerModel.findOne({ userId: dto.userId });
    if (existing) {
      this.logger.info(`Customer profile already exists for user ${dto.userId}`);
      return existing;
    }

    const customer = await this.customerModel.create({
      userId: dto.userId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      address: dto.address,
      kycStatus: KycStatus.PENDING,
      riskScore: 30, // Default low baseline risk
    });

    this.logger.info(`Created customer profile for userId ${dto.userId} (customerId: ${customer._id})`);

    // Publish customer.created event
    await this.eventBus.publish<ICustomerCreatedPayload>(KafkaTopics.CUSTOMER_CREATED, {
      eventId: `cust_${Date.now()}_${customer._id}`,
      eventType: KafkaTopics.CUSTOMER_CREATED,
      sourceService: 'customer-service',
      timestamp: new Date().toISOString(),
      correlationId: dto.userId,
      payload: {
        customerId: customer._id.toString(),
        userId: dto.userId,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        kycStatus: customer.kycStatus,
      },
    });

    return customer;
  }

  async getByUserId(userId: string): Promise<CustomerDocument> {
    let customer = await this.customerModel.findOne({ userId });
    if (!customer) {
      // Auto-fallback default customer profile if not yet created
      customer = await this.customerModel.create({
        userId,
        firstName: 'Valued',
        lastName: 'Member',
        email: `user_${userId.slice(-6)}@novabank.com`,
        kycStatus: KycStatus.PENDING,
        riskScore: 20,
      });
    }
    return customer;
  }

  async updateProfile(userId: string, dto: UpdateCustomerDto): Promise<CustomerDocument> {
    const customer = await this.getByUserId(userId);

    if (dto.firstName) customer.firstName = dto.firstName;
    if (dto.lastName) customer.lastName = dto.lastName;
    if (dto.phone) customer.phone = dto.phone;
    if (dto.dateOfBirth) customer.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.address) {
      customer.address = {
        ...customer.address,
        ...dto.address,
      };
    }

    await customer.save();
    this.logger.info(`Updated customer profile for userId ${userId}`);
    return customer;
  }

  async submitKyc(userId: string, dto: SubmitKycDto): Promise<CustomerDocument> {
    const customer = await this.getByUserId(userId);

    customer.kycDocumentType = dto.documentType;
    customer.kycDocumentNumber = dto.documentNumber;
    customer.kycStatus = KycStatus.VERIFIED; // Instant verification for demo / sandbox
    customer.riskScore = 15; // Low risk after verification

    await customer.save();
    this.logger.info(`KYC verified for customer ${customer._id} (userId: ${userId})`);
    return customer;
  }

  async getById(id: string): Promise<CustomerDocument> {
    const customer = await this.customerModel.findById(id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }
}
