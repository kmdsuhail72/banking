import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { CardService } from './card.service';

/** gRPC server-side controller for CardService proto */
@Controller()
export class CardGrpcController {
  constructor(private readonly service: CardService) {}

  // TODO: Implement gRPC methods using @GrpcMethod('CardService', 'MethodName')
}
