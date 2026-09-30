import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { StatementService } from "./statement.service";

/** gRPC server-side controller for StatementService proto */
@Controller()
export class StatementGrpcController {
  constructor(private readonly service: StatementService) {}

  // TODO: Implement gRPC methods using @GrpcMethod('StatementService', 'MethodName')
}
