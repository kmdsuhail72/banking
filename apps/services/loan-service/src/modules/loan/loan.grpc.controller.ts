import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { LoanService } from './loan.service';

/** gRPC server-side controller for LoanService proto */
@Controller()
export class LoanGrpcController {
  constructor(private readonly service: LoanService) {}

  // TODO: Implement gRPC methods using @GrpcMethod('LoanService', 'MethodName')
}
