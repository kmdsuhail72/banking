import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { RecurringDepositService } from "./recurringdeposit.service";

/** gRPC server-side controller for RecurringDepositService proto */
@Controller()
export class RecurringDepositGrpcController {
  constructor(private readonly service: RecurringDepositService) {}

  // TODO: Implement gRPC methods using @GrpcMethod('RecurringDepositService', 'MethodName')
}
