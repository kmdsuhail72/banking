import { Controller, All, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';

@Controller('api/v1')
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All('auth*')
  handleAuth(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.forwardRequest('auth', req, res);
  }

  @All('customers*')
  handleCustomers(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.forwardRequest('customers', req, res);
  }

  @All('accounts*')
  handleAccounts(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.forwardRequest('accounts', req, res);
  }

  @All('transactions*')
  handleTransactions(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.forwardRequest('transactions', req, res);
  }
}
