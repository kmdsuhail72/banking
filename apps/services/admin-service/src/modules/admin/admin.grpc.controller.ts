import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { AdminService } from "./admin.service";

/** gRPC server-side controller for AdminService proto */
@Controller()
export class AdminGrpcController {
  constructor(private readonly service: AdminService) {}

  // TODO: Implement gRPC methods using @GrpcMethod('AdminService', 'MethodName')
}
