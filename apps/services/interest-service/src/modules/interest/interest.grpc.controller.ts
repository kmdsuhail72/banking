import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { InterestService } from "./interest.service";

/** gRPC server-side controller for InterestService proto */
@Controller()
export class InterestGrpcController {
  constructor(private readonly service: InterestService) {}

  // TODO: Implement gRPC methods using @GrpcMethod('InterestService', 'MethodName')
}
