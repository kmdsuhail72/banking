import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { appConfig } from "@banking/config";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // 1. Check for header enriched by API Gateway
    const gatewayUserId = request.headers["x-user-id"];
    if (gatewayUserId) {
      request.user = {
        sub: gatewayUserId as string,
        email: request.headers["x-user-email"] as string,
        role: request.headers["x-user-role"] as string,
      };
      return true;
    }

    // 2. Direct Bearer token verification
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid authorization token");
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, appConfig.jwt.accessSecret) as any;
      request.user = decoded;
      return true;
    } catch {
      throw new UnauthorizedException("Token is invalid or expired");
    }
  }
}
