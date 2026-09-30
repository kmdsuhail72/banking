import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  Headers,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { CustomerService } from "./customer.service";
import { CreateCustomerRequestDto } from "./dto/create-customer.dto";
import { UpdateCustomerRequestDto } from "./dto/update-customer.dto";
import { SubmitKycRequestDto } from "./dto/submit-kyc.dto";
import * as jwt from "jsonwebtoken";
import { appConfig } from "@banking/config";
import { JwtPayload } from "@banking/shared-types";

@Controller("customers")
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  private extractUserId(req: any, headers: Record<string, string>): string {
    const headerUserId = headers["x-user-id"];
    if (headerUserId) return headerUserId;

    const authHeader = headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(
          token,
          appConfig.jwt.accessSecret,
        ) as JwtPayload;
        return decoded.sub;
      } catch {
        throw new UnauthorizedException("Invalid access token");
      }
    }

    throw new UnauthorizedException("User authentication required");
  }

  /**
   * Internal endpoint — called by Kafka consumer / other services
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCustomer(@Body() dto: CreateCustomerRequestDto) {
    return this.customerService.createCustomer(dto);
  }

  /**
   * GET /customers/me — returns the authenticated user's customer profile
   */
  @Get("me")
  async getMe(@Req() req: any, @Headers() headers: Record<string, string>) {
    const userId = this.extractUserId(req, headers);
    return this.customerService.getMe(userId);
  }

  /**
   * PATCH /customers/me — self-service profile update
   */
  @Patch("me")
  async updateMe(
    @Req() req: any,
    @Headers() headers: Record<string, string>,
    @Body() dto: UpdateCustomerRequestDto,
  ) {
    const userId = this.extractUserId(req, headers);
    return this.customerService.updateProfile(userId, dto);
  }

  /**
   * POST /customers/me/kyc — submit KYC document for verification
   */
  @Post("me/kyc")
  @HttpCode(HttpStatus.OK)
  async submitKyc(
    @Req() req: any,
    @Headers() headers: Record<string, string>,
    @Body() dto: SubmitKycRequestDto,
  ) {
    const userId = this.extractUserId(req, headers);
    return this.customerService.submitKyc(userId, dto);
  }

  /**
   * GET /customers/:id — admin/internal lookup by MongoDB ID
   */
  @Get(":id")
  async getCustomerById(@Param("id") id: string) {
    return this.customerService.getCustomerById(id);
  }

  /**
   * PATCH /customers/:id — admin profile update by ID
   */
  @Patch(":id")
  async updateCustomer(
    @Param("id") id: string,
    @Body() dto: UpdateCustomerRequestDto,
  ) {
    return this.customerService.updateCustomer(id, dto);
  }
}
