import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as argon2 from 'argon2';
import { User, UserDocument } from './schemas/user.schema';
import { RedisService } from '../redis/redis.service';
import { TokenService } from './services/token.service';
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
import { v4 as uuidv4 } from 'uuid';

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
    private readonly tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.userModel.findOne({ email });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    const user = await this.userModel.create({
      email,
      passwordHash,
      role: UserRole.CUSTOMER,
      status: UserStatus.PENDING,
      emailVerified: false,
    });

    const sessionId = uuidv4();
    const tokens = this.tokenService.generateAuthTokens(
      user._id.toString(),
      user.email,
      user.role,
      sessionId,
    );

    // Store session in Redis
    await this.redisService.setSession(user._id.toString(), {
      userId: user._id.toString(),
      refreshTokenHash: this.tokenService.hashToken(tokens.refreshToken),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Publish event for downstream consumers (e.g. customer-service auto-provisioning)
    try {
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
    } catch (err: any) {
      this.logger.warn(`Could not publish user.registered event: ${err.message}`);
    }

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

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await argon2.verify(user.passwordHash, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is suspended. Please contact support.');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const sessionId = uuidv4();
    const tokens = this.tokenService.generateAuthTokens(
      user._id.toString(),
      user.email,
      user.role,
      sessionId,
    );

    // Save session in Redis
    await this.redisService.setSession(user._id.toString(), {
      userId: user._id.toString(),
      refreshTokenHash: this.tokenService.hashToken(tokens.refreshToken),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    this.logger.info(`User logged in: ${user.email}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
      },
    };
  }

  async refreshToken(token: string): Promise<AuthTokens> {
    if (!token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const decoded = this.tokenService.verifyRefreshToken(token);
      const session = await this.redisService.getSession(decoded.sub);

      if (!session) {
        throw new UnauthorizedException('Session expired or revoked');
      }

      const isTokenValid = this.tokenService.hashToken(token) === session.refreshTokenHash;
      if (!isTokenValid) {
        await this.redisService.deleteSession(decoded.sub);
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.userModel.findById(decoded.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const sessionId = uuidv4();
      const newTokens = this.tokenService.generateAuthTokens(
        user._id.toString(),
        user.email,
        user.role,
        sessionId,
      );

      // Rotate session refresh token
      await this.redisService.setSession(user._id.toString(), {
        userId: user._id.toString(),
        refreshTokenHash: this.tokenService.hashToken(newTokens.refreshToken),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      return newTokens;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException(err.message || 'Invalid refresh token');
    }
  }

  async logout(userId: string, accessToken?: string): Promise<{ success: boolean }> {
    await this.redisService.deleteSession(userId);
    if (accessToken) {
      // Blacklist token for remainder of its 15-min TTL
      await this.redisService.blacklistToken(accessToken, 900);
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

  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userModel.findOne({ email: normalizedEmail });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If this email is registered, a reset link has been sent.' };
    }

    const resetToken = this.tokenService.generateRandomToken(32);
    const tokenHash = this.tokenService.hashToken(resetToken);

    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // TODO: Publish notification event for email delivery
    this.logger.info(`Password reset token generated for: ${normalizedEmail} (token: ${resetToken})`);

    return { message: 'If this email is registered, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const tokenHash = this.tokenService.hashToken(token);
    const user = await this.userModel.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Password reset token is invalid or has expired');
    }

    user.passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;

    // Revoke all existing sessions after password reset
    await this.redisService.deleteSession(user._id.toString());
    await user.save();

    this.logger.info(`Password reset successfully for user: ${user.email}`);
    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const tokenHash = this.tokenService.hashToken(token);
    const user = await this.userModel.findOne({ emailVerificationTokenHash: tokenHash });

    if (!user) {
      throw new BadRequestException('Email verification token is invalid or has already been used');
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = undefined;
    if (user.status === UserStatus.PENDING) {
      user.status = UserStatus.ACTIVE;
    }
    await user.save();

    this.logger.info(`Email verified for user: ${user.email}`);
    return { message: 'Email verified successfully. Your account is now active.' };
  }
}
