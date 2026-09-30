import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { SchedulerService } from "./scheduler.service";

/** gRPC server-side controller for SchedulerService proto */
@Controller()
export class SchedulerGrpcController {
  constructor(private readonly service: SchedulerService) {}

  // TODO: Implement gRPC methods using @GrpcMethod('SchedulerService', 'MethodName')
}
