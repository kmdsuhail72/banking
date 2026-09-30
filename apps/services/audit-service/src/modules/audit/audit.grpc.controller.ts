import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuditService } from './audit.service';

/** gRPC server-side controller for AuditService proto */
@Controller()
export class AuditGrpcController {
  constructor(private readonly service: AuditService) {}

  // TODO: Implement gRPC methods using @GrpcMethod('AuditService', 'MethodName')
}
