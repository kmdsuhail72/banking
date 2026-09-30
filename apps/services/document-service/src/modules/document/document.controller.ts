import { Controller, Get, UseGuards } from "@nestjs/common";
import { DocumentService } from "./document.service";

@Controller("document")
export class DocumentController {
  constructor(private readonly service: DocumentService) {}

  @Get()
  async findAll() {
    return { message: "KYC document storage (S3) endpoint", data: [] };
  }
}
