import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ComplianceService } from './compliance.service';

/** gRPC server-side controller for ComplianceService proto */
@Controller()
export class ComplianceGrpcController {
  constructor(private readonly service: ComplianceService) {}

  // TODO: Implement gRPC methods using @GrpcMethod('ComplianceService', 'MethodName')
}
