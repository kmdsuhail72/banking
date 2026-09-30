import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { appConfig } from "@banking/config";
import { JwtPayload } from "@banking/shared-types";

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private publicPaths = [
    /^\/api\/v1\/auth\/register$/,
    /^\/api\/v1\/auth\/login$/,
    /^\/api\/v1\/auth\/refresh$/,
    /^\/api\/v1\/auth\/forgot-password$/,
    /^\/api\/v1\/auth\/reset-password$/,
    /^\/api\/v1\/auth\/verify-email$/,
    /^\/health/,
    /^\/$/,
  ];

  use(req: Request, res: Response, next: NextFunction) {
    // Always allow OPTIONS preflight requests (CORS)
    if (req.method === "OPTIONS") return next();

    const fullPath = req.originalUrl.split("?")[0]; // strip query params

    const isPublic = this.publicPaths.some((regex) => regex.test(fullPath));

    const authHeader = req.headers["authorization"];
    let token: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          appConfig.jwt.accessSecret,
        ) as JwtPayload;
        (req as any).user = decoded;
        req.headers["x-user-id"] = decoded.sub;
        req.headers["x-user-email"] = decoded.email;
        req.headers["x-user-role"] = decoded.role;
      } catch (err) {
        if (!isPublic) {
          return res.status(HttpStatus.UNAUTHORIZED).json({
            statusCode: HttpStatus.UNAUTHORIZED,
            message: "Invalid or expired access token",
          });
        }
      }
    } else if (!isPublic) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: "Authorization header is required (Bearer <token>)",
      });
    }

    next();
  }
}
