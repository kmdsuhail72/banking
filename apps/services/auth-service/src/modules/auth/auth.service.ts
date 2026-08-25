import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { User, UserDocument } from '../../schemas/user.schema';
import { RedisService } from '../redis/redis.service';
import { appConfig } from '@banking/config';
import { createLogger } from '@banking/logger';
import { KafkaEventBus } from '@banking/kafka';
import {
  UserRole,
  UserStatus,
  RegisterDto,
  LoginDto,
  AuthResponse,
  AuthTokens,
  JwtPayload,
  KafkaTopics,
  IUserRegisteredPayload,
} from '@banking/shared-types';

@Injectable()
export class AuthService {
  private logger = createLogger('AuthService');
  private eventBus = new KafkaEventBus({
    clientId: 'auth-service',
    brokers: appConfig.kafka.brokers,
  });

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly redisService: RedisService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.userModel.findOne({ email });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.userModel.create({
      email,
      passwordHash,
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      emailVerified: false,
    });

    const tokens = this.generateTokens(user._id.toString(), user.email, user.role);

    // Store session in Redis
    await this.redisService.setSession(user._id.toString(), {
      userId: user._id.toString(),
      refreshTokenHash: await bcrypt.hash(tokens.refreshToken, 6),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Publish event for downstream consumers (e.g. customer-service auto-provisioning)
    await this.eventBus.publish<IUserRegisteredPayload>(KafkaTopics.USER_REGISTERED, {
      eventId: `reg_${Date.now()}_${user._id}`,
      eventType: KafkaTopics.USER_REGISTERED,
      sourceService: 'auth-service',
      timestamp: new Date().toISOString(),
      correlationId: user._id.toString(),
      payload: {
        userId: user._id.toString(),
        email: user.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: user.role,
        registeredAt: new Date().toISOString(),
      },
    });

    this.logger.info(`User registered successfully: ${user.email} (${user._id})`);

    return {
      message: 'Registration successful',
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
      tokens,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(`Account is ${user.status.toLowerCase()}. Please contact support.`);
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = this.generateTokens(user._id.toString(), user.email, user.role);

    // Save session in Redis
    await this.redisService.setSession(user._id.toString(), {
      userId: user._id.toString(),
      refreshTokenHash: await bcrypt.hash(tokens.refreshToken, 6),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    this.logger.info(`User logged in: ${user.email}`);

    return {
      message: 'Login successful',
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
      },
      tokens,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshToken(token: string): Promise<AuthTokens> {
    if (!token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const decoded = jwt.verify(token, appConfig.jwt.refreshSecret) as JwtPayload;
      const session = await this.redisService.getSession(decoded.sub);

      if (!session) {
        throw new UnauthorizedException('Session expired or revoked');
      }

      const isTokenValid = await bcrypt.compare(token, session.refreshTokenHash);
      if (!isTokenValid) {
        await this.redisService.deleteSession(decoded.sub);
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.userModel.findById(decoded.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newTokens = this.generateTokens(user._id.toString(), user.email, user.role);

      // Rotate session refresh token
      await this.redisService.setSession(user._id.toString(), {
        userId: user._id.toString(),
        refreshTokenHash: await bcrypt.hash(newTokens.refreshToken, 6),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      return newTokens;
    } catch (err: any) {
      throw new UnauthorizedException(err.message || 'Invalid refresh token');
    }
  }

  async logout(userId: string, accessToken?: string): Promise<{ success: boolean }> {
    await this.redisService.deleteSession(userId);
    if (accessToken) {
      await this.redisService.blacklistToken(accessToken);
    }
    this.logger.info(`User logged out: ${userId}`);
    return { success: true };
  }

  async getMe(userId: string) {
    const user = await this.userModel.findById(userId).select('-passwordHash');
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: (user as any).createdAt,
    };
  }

  private generateTokens(userId: string, email: string, role: UserRole): AuthTokens {
    const payload: JwtPayload = { sub: userId, email, role };

    const accessToken = jwt.sign(payload, appConfig.jwt.accessSecret, {
      expiresIn: '15m',
    });

    const refreshToken = jwt.sign(payload, appConfig.jwt.refreshSecret, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 mins in seconds
    };
  }
}
