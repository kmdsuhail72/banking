import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CardController } from "./card.controller";
import { CardService } from "./card.service";
import { CardGrpcController } from "./card.grpc.controller";
import { CardEntity } from "../../entities/card.entity";

@Module({
  imports: [TypeOrmModule.forFeature([CardEntity])],
  controllers: [CardController, CardGrpcController],
  providers: [CardService],
  exports: [CardService],
})
export class CardModule {}
