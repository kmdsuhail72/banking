import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { AuthzService } from "./authz.service";

/** gRPC server-side controller for AuthzService proto */
@Controller()
export class AuthzGrpcController {
  constructor(private readonly service: AuthzService) {}

  // TODO: Implement gRPC methods using @GrpcMethod('AuthzService', 'MethodName')
}
