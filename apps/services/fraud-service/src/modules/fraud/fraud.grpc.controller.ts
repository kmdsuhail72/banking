import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { FraudService } from './fraud.service';

/** gRPC server-side controller for FraudService proto */
@Controller()
export class FraudGrpcController {
  constructor(private readonly service: FraudService) {}

  // TODO: Implement gRPC methods using @GrpcMethod('FraudService', 'MethodName')
}
