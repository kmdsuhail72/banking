import { Controller, Get, UseGuards } from "@nestjs/common";
import { CardService } from "./card.service";

@Controller("card")
export class CardController {
  constructor(private readonly service: CardService) {}

  @Get()
  async findAll() {
    return { message: "Card issuance and management endpoint", data: [] };
  }
}
