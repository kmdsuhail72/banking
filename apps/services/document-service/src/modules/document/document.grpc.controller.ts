import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { DocumentService } from "./document.service";

/** gRPC server-side controller for DocumentService proto */
@Controller()
export class DocumentGrpcController {
  constructor(private readonly service: DocumentService) {}

  // TODO: Implement gRPC methods using @GrpcMethod('DocumentService', 'MethodName')
}
