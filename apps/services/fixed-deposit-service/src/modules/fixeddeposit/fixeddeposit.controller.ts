import { Controller, Get, UseGuards } from "@nestjs/common";
import { FixedDepositService } from "./fixeddeposit.service";

@Controller("fixeddeposit")
export class FixedDepositController {
  constructor(private readonly service: FixedDepositService) {}

  @Get()
  async findAll() {
    return { message: "Fixed deposit management endpoint", data: [] };
  }
}
