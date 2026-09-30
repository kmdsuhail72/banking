import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { EmiService } from "./emi.service";

/** gRPC server-side controller for EmiService proto */
@Controller()
export class EmiGrpcController {
  constructor(private readonly service: EmiService) {}

  // TODO: Implement gRPC methods using @GrpcMethod('EmiService', 'MethodName')
}
