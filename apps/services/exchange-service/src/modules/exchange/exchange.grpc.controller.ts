import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ExchangeService } from './exchange.service';

/** gRPC server-side controller for ExchangeService proto */
@Controller()
export class ExchangeGrpcController {
  constructor(private readonly service: ExchangeService) {}

  // TODO: Implement gRPC methods using @GrpcMethod('ExchangeService', 'MethodName')
}
