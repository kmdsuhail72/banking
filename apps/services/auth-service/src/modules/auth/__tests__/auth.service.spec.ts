import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { JwtModule } from "@nestjs/jwt";
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { AuthService } from "../auth.service";
import { User } from "../schemas/user.schema";
import { TokenService } from "../services/token.service";
import { RedisService } from "../../redis/redis.service";
import { UserRole, UserStatus } from "@banking/shared-types";

describe("AuthService Unit Tests", () => {
  let authService: AuthService;
  let tokenService: TokenService;
  let redisService: RedisService;

  const mockUser = {
    _id: "66abc123456789abcdef0001",
    email: "test@novabank.com",
    passwordHash: "",
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

  const mockRedisService = {
    setSession: jest.fn().mockResolvedValue(undefined),
    getSession: jest.fn().mockResolvedValue(null),
    deleteSession: jest.fn().mockResolvedValue(undefined),
    blacklistToken: jest.fn().mockResolvedValue(undefined),
    isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  };

  beforeAll(async () => {
    mockUser.passwordHash = await argon2.hash("Password@123", {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: "test-access-secret",
          signOptions: { expiresIn: "15m" },
        }),
      ],
      providers: [
        AuthService,
        TokenService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    tokenService = module.get<TokenService>(TokenService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Registration", () => {
    it("should register a new user with Argon2 password hash and PENDING status", async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue({
        _id: "66abc123456789abcdef0001",
        email: "john@novabank.com",
        role: UserRole.CUSTOMER,
        status: UserStatus.PENDING,
        emailVerified: false,
      });

      const result = await authService.register({
        firstName: "John",
        lastName: "Doe",
        email: "john@novabank.com",
        password: "Password@123",
      });

      expect(result.user.id).toBe("66abc123456789abcdef0001");
      expect(result.user.email).toBe("john@novabank.com");
      expect(result.user.status).toBe(UserStatus.PENDING);
      expect(mockUserModel.create).toHaveBeenCalled();
      expect(mockRedisService.setSession).toHaveBeenCalled();
    });

    it("should throw ConflictException on duplicate email", async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          firstName: "John",
          lastName: "Doe",
          email: "test@novabank.com",
          password: "Password@123",
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("Login", () => {
    it("should authenticate user with valid credentials and return JWT tokens", async () => {
      mockUserModel.findOne.mockResolvedValue({
        ...mockUser,
        save: jest.fn().mockResolvedValue(true),
      });

      const result = await authService.login({
        email: "test@novabank.com",
        password: "Password@123",
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe("test@novabank.com");
    });

    it("should throw UnauthorizedException with generic message for wrong password", async () => {
      mockUserModel.findOne.mockResolvedValue({
        ...mockUser,
        save: jest.fn().mockResolvedValue(true),
      });

      await expect(
        authService.login({
          email: "test@novabank.com",
          password: "WrongPassword@999",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for non-existing email", async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(
        authService.login({
          email: "nonexistent@novabank.com",
          password: "Password@123",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for suspended account", async () => {
      mockUserModel.findOne.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
        save: jest.fn().mockResolvedValue(true),
      });

      await expect(
        authService.login({
          email: "test@novabank.com",
          password: "Password@123",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("Forgot Password", () => {
    it("should return generic message when email not found (prevent enumeration)", async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      const result = await authService.forgotPassword("notfound@novabank.com");
      expect(result.message).toContain("If this email is registered");
    });

    it("should set password reset token on valid email", async () => {
      const saveMock = jest.fn().mockResolvedValue(true);
      mockUserModel.findOne.mockResolvedValue({ ...mockUser, save: saveMock });

      const result = await authService.forgotPassword("test@novabank.com");
      expect(result.message).toContain("If this email is registered");
      expect(saveMock).toHaveBeenCalled();
    });
  });

  describe("Logout", () => {
    it("should delete session and blacklist access token on logout", async () => {
      await authService.logout("user123", "some-access-token");
      expect(mockRedisService.deleteSession).toHaveBeenCalledWith("user123");
      expect(mockRedisService.blacklistToken).toHaveBeenCalledWith(
        "some-access-token",
        900,
      );
    });
  });
});
