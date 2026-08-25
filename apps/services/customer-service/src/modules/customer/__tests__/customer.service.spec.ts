import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { CustomerService } from '../customer.service';
import { Customer } from '../schemas/customer.schema';
import { KycStatus } from '@banking/shared-types';

describe('CustomerService Unit Tests', () => {
  let customerService: CustomerService;

  const mockCustomer = {
    _id: '66def123456789abcdef0002',
    userId: '66abc123456789abcdef0001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@novabank.com',
    phone: '+15550192834',
    kycStatus: KycStatus.PENDING,
    riskScore: 0,
    address: {
      street: '123 Wall St',
      city: 'New York',
      state: 'NY',
      postalCode: '10005',
      country: 'USA',
    },
  };

  const mockCustomerModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: getModelToken(Customer.name),
          useValue: mockCustomerModel,
        },
      ],
    }).compile();

    customerService = module.get<CustomerService>(CustomerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Customer Creation & Idempotency', () => {
    it('should create a customer profile if not already present', async () => {
      mockCustomerModel.findOne.mockResolvedValue(null);
      mockCustomerModel.create.mockResolvedValue(mockCustomer);

      const result = await customerService.createCustomer({
        userId: '66abc123456789abcdef0001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@novabank.com',
      });

      expect(result).toEqual(mockCustomer);
      expect(mockCustomerModel.create).toHaveBeenCalled();
    });

    it('should return existing customer profile on duplicate event replay (idempotent)', async () => {
      mockCustomerModel.findOne.mockResolvedValue(mockCustomer);

      const result = await customerService.createCustomer({
        userId: '66abc123456789abcdef0001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@novabank.com',
      });

      expect(result).toEqual(mockCustomer);
      expect(mockCustomerModel.create).not.toHaveBeenCalled();
    });
  });

  describe('Get Profile', () => {
    it('should return customer profile by userId', async () => {
      mockCustomerModel.findOne.mockResolvedValue(mockCustomer);

      const result = await customerService.getMe('66abc123456789abcdef0001');
      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      mockCustomerModel.findOne.mockResolvedValue(null);

      await expect(
        customerService.getMe('nonexistent-user-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Update Profile', () => {
    it('should update customer profile details', async () => {
      const updatedMock = {
        ...mockCustomer,
        phone: '+15559998888',
      };
      mockCustomerModel.findOneAndUpdate.mockResolvedValue(updatedMock);

      const result = await customerService.updateCustomer('66abc123456789abcdef0001', {
        phone: '+15559998888',
      });

      expect(result.phone).toBe('+15559998888');
    });
  });
});
