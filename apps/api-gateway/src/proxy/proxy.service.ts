import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosRequestConfig, Method } from 'axios';
import { Request, Response } from 'express';
import { appConfig } from '@banking/config';
import { createLogger } from '@banking/logger';

@Injectable()
export class ProxyService {
  private logger = createLogger('API-Gateway:ProxyService');

  private serviceMap: Record<string, string> = {
    auth: `http://localhost:${appConfig.ports.auth}`,
    customers: `http://localhost:${appConfig.ports.customer}`,
    accounts: `http://localhost:${appConfig.ports.account}`,
    transactions: `http://localhost:${appConfig.ports.transaction}`,
    ledger: `http://localhost:${appConfig.ports.ledger}`,
    payments: `http://localhost:${appConfig.ports.payment}`,
    wallets: `http://localhost:${appConfig.ports.wallet}`,
    beneficiaries: `http://localhost:${appConfig.ports.beneficiary}`,
    notifications: `http://localhost:${appConfig.ports.notification}`,
    kyc: `http://localhost:${appConfig.ports.kycRisk}`,
    reporting: `http://localhost:${appConfig.ports.reporting}`,
  };

  async forwardRequest(serviceKey: string, req: Request, res: Response): Promise<void> {
    const targetBase = this.serviceMap[serviceKey];
    if (!targetBase) {
      throw new HttpException(
        `Target service '${serviceKey}' not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const targetUrl = `${targetBase}${req.originalUrl}`;
    this.logger.info(`Forwarding ${req.method} ${req.originalUrl} -> ${targetUrl}`);

    const headers: Record<string, any> = { ...req.headers };
    delete headers.host;
    delete headers['content-length'];

    const config: AxiosRequestConfig = {
      method: req.method as Method,
      url: targetUrl,
      headers,
      data: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
      params: req.query,
      validateStatus: () => true, // Don't throw on error status codes, forward them
      timeout: 10000,
    };

    try {
      const response = await axios(config);

      // Forward response headers (e.g. Set-Cookie, Content-Type)
      Object.entries(response.headers).forEach(([key, value]) => {
        if (value && !['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
          res.setHeader(key, value as any);
        }
      });

      res.status(response.status).json(response.data);
    } catch (err: any) {
      this.logger.error(`Error forwarding request to ${targetUrl}: ${err.message}`);

      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        res.status(HttpStatus.BAD_GATEWAY).json({
          statusCode: HttpStatus.BAD_GATEWAY,
          message: `Microservice '${serviceKey}' is currently unavailable.`,
          error: 'Bad Gateway',
        });
        return;
      }

      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Internal gateway forwarding error',
      });
    }
  }
}
