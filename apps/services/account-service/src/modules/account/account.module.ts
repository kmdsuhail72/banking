import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from './schemas/account.schema';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
    ]),
  ],
  controllers: [AccountController],
  providers: [AccountService, JwtAuthGuard],
  exports: [AccountService],
})
export class AccountModule {}
