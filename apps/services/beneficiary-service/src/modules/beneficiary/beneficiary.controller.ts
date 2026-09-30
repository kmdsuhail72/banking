import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { BeneficiaryService } from './beneficiary.service';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('beneficiaries')
@UseGuards(JwtAuthGuard)
export class BeneficiaryController {
  constructor(private readonly beneficiaryService: BeneficiaryService) {}

  /**
   * POST /beneficiaries — add a new beneficiary
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addBeneficiary(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateBeneficiaryDto,
  ) {
    if (!userId) throw new BadRequestException('User ID could not be identified');
    return this.beneficiaryService.addBeneficiary(userId, dto);
  }

  /**
   * GET /beneficiaries — list all beneficiaries for the user
   */
  @Get()
  async getBeneficiaries(@CurrentUser('sub') userId: string) {
    if (!userId) throw new BadRequestException('User ID could not be identified');
    const beneficiaries = await this.beneficiaryService.getBeneficiaries(userId);
    return { beneficiaries };
  }

  /**
   * GET /beneficiaries/:id — get a single beneficiary
   */
  @Get(':id')
  async getBeneficiary(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    if (!userId) throw new BadRequestException('User ID could not be identified');
    return this.beneficiaryService.getBeneficiaryById(id, userId);
  }

  /**
   * PATCH /beneficiaries/:id — update nickname / bank details
   */
  @Patch(':id')
  async updateBeneficiary(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateBeneficiaryDto,
  ) {
    if (!userId) throw new BadRequestException('User ID could not be identified');
    return this.beneficiaryService.updateBeneficiary(id, userId, dto);
  }

  /**
   * DELETE /beneficiaries/:id — remove a beneficiary
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async removeBeneficiary(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    if (!userId) throw new BadRequestException('User ID could not be identified');
    return this.beneficiaryService.removeBeneficiary(id, userId);
  }

  /**
   * PATCH /beneficiaries/:id/verify — internal: mark as verified
   */
  @Patch(':id/verify')
  @HttpCode(HttpStatus.OK)
  async verifyBeneficiary(@Param('id') id: string) {
    return this.beneficiaryService.verifyBeneficiary(id);
  }
}
