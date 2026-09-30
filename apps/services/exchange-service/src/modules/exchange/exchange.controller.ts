import { Controller, Get, UseGuards } from "@nestjs/common";
import { ExchangeService } from "./exchange.service";

@Controller("exchange")
export class ExchangeController {
  constructor(private readonly service: ExchangeService) {}

  @Get()
  async findAll() {
    return {
      message: "Currency exchange rates and FX conversion endpoint",
      data: [],
    };
  }
}
