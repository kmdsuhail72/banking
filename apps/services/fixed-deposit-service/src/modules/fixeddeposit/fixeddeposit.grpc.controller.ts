import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { FixedDepositService } from "./fixeddeposit.service";

/** gRPC server-side controller for FixedDepositService proto */
@Controller()
export class FixedDepositGrpcController {
  constructor(private readonly service: FixedDepositService) {}

  // TODO: Implement gRPC methods using @GrpcMethod('FixedDepositService', 'MethodName')
}
