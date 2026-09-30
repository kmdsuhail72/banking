import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AnalyticsService } from './analytics.service';

/** gRPC server-side controller for AnalyticsService proto */
@Controller()
export class AnalyticsGrpcController {
  constructor(private readonly service: AnalyticsService) {}

  // TODO: Implement gRPC methods using @GrpcMethod('AnalyticsService', 'MethodName')
}
