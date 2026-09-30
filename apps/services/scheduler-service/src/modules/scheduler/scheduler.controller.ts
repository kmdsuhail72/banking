import { Controller, Get, UseGuards } from "@nestjs/common";
import { SchedulerService } from "./scheduler.service";

@Controller("scheduler")
export class SchedulerController {
  constructor(private readonly service: SchedulerService) {}

  @Get()
  async findAll() {
    return { message: "Cron-based batch job triggers endpoint", data: [] };
  }
}
