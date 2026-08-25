import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from '../auth.service';
import { User } from '../schemas/user.schema';
import { TokenService } from '../services/token.service';
import { RedisSessionService } from '../services/redis-session.service';
import { UserRole, UserStatus } from '@banking/shared-types';

describe('AuthService Unit Tests', () => {
  let authService: AuthService;
  let tokenService: TokenService;
  let redisSessionService: RedisSessionService;

  const mockUser = {
    _id: '66abc123456789abcdef0001',
    email: 'test@novabank.com',
    passwordHash: '',
    role: UserRole.CUSTOMER,
    status: UserStatus.PENDING,
    emailVerified: false,
    save: jest.fn().mockResolvedValue(true),
  };

  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };

  beforeAll(async () => {
    mockUser.passwordHash = await argon2.hash('Password@123', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        TokenService,
        RedisSessionService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    tokenService = module.get<TokenService>(TokenService);
    redisSessionService = module.get<RedisSessionService>(RedisSessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Registration', () => {
    it('should register a new user with Argon2 password hash', async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue({
        _id: '66abc123456789abcdef0001',
        email: 'john@novabank.com',
        role: UserRole.CUSTOMER,
        status: UserStatus.PENDING,
        emailVerified: false,
      });

      const result = await authService.register({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@novabank.com',
        password: 'Password@123',
      });

      expect(result.userId).toBe('66abc123456789abcdef0001');
      expect(result.email).toBe('john@novabank.com');
      expect(result.status).toBe(UserStatus.PENDING);
      expect(mockUserModel.create).toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate email', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          firstName: 'John',
          lastName: 'Doe',
          email: 'test@novabank.com',
          password: 'Password@123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Login', () => {
    it('should authenticate user with valid credentials and return JWT tokens', async () => {
      mockUserModel.findOne.mockResolvedValue({
        ...mockUser,
        save: jest.fn().mockResolvedValue(true),
      });

      const result = await authService.login({
        email: 'test@novabank.com',
        password: 'Password@123',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test@novabank.com');
    });

    it('should throw UnauthorizedException with generic message for wrong password', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);

      await expect(
        authService.login({
          email: 'test@novabank.com',
          password: 'WrongPassword@999',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existing email', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@novabank.com',
          password: 'Password@123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
