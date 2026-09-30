import { Controller, Get, UseGuards } from "@nestjs/common";
import { InterestService } from "./interest.service";

@Controller("interest")
export class InterestController {
  constructor(private readonly service: InterestService) {}

  @Get()
  async findAll() {
    return {
      message: "Interest accrual for savings and loans endpoint",
      data: [],
    };
  }
}
