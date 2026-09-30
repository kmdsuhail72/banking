import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as crypto from "crypto";
import { appConfig } from "@banking/config";
import { AuthTokens, JwtPayload, UserRole } from "@banking/shared-types";

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
}

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  generateAccessToken(
    userId: string,
    email: string,
    role: UserRole | string,
  ): string {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role: role.toString(),
    };

    return this.jwtService.sign(payload, {
      secret: appConfig.jwt.accessSecret,
      expiresIn: "15m",
    });
  }

  generateRefreshToken(userId: string, sessionId: string): string {
    const payload: RefreshTokenPayload = {
      sub: userId,
      sessionId,
    };

    return this.jwtService.sign(payload, {
      secret: appConfig.jwt.refreshSecret,
      expiresIn: "7d",
    });
  }

  generateAuthTokens(
    userId: string,
    email: string,
    role: UserRole | string,
    sessionId: string,
  ): AuthTokens {
    const accessToken = this.generateAccessToken(userId, email, role);
    const refreshToken = this.generateRefreshToken(userId, sessionId);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: appConfig.jwt.accessSecret,
      });
    } catch (err: any) {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return this.jwtService.verify<RefreshTokenPayload>(token, {
        secret: appConfig.jwt.refreshSecret,
      });
    } catch (err: any) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  generateRandomToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString("hex");
  }
}
