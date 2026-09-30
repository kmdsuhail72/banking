import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuditService } from "./audit.service";

@Controller("audit")
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  async findAll() {
    return { message: "Immutable audit trail endpoint", data: [] };
  }
}
