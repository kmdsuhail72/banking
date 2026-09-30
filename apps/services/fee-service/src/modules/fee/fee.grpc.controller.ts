import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { FeeService } from './fee.service';

/** gRPC server-side controller for FeeService proto */
@Controller()
export class FeeGrpcController {
  constructor(private readonly service: FeeService) {}

  // TODO: Implement gRPC methods using @GrpcMethod('FeeService', 'MethodName')
}
