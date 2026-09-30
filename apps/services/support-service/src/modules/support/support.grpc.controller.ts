import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { SupportService } from './support.service';

/** gRPC server-side controller for SupportService proto */
@Controller()
export class SupportGrpcController {
  constructor(private readonly service: SupportService) {}

  // TODO: Implement gRPC methods using @GrpcMethod('SupportService', 'MethodName')
}
