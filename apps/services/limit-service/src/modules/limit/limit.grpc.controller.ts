import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { LimitService } from './limit.service';

/** gRPC server-side controller for LimitService proto */
@Controller()
export class LimitGrpcController {
  constructor(private readonly service: LimitService) {}

  // TODO: Implement gRPC methods using @GrpcMethod('LimitService', 'MethodName')
}
