import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from root if available
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export interface IAppConfig {
  nodeEnv: string;
  isProduction: boolean;
  mongodb: {
    uri: string;
  };
  redis: {
    url: string;
  };
  kafka: {
    brokers: string[];
  };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiration: string;
    refreshExpiration: string;
  };
  ports: Record<string, number>;
}

export const appConfig: IAppConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/banking',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_key',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  ports: {
    gateway: parseInt(process.env.API_GATEWAY_PORT || '3000', 10),
    frontend: parseInt(process.env.FRONTEND_PORT || '3001', 10),
    auth: parseInt(process.env.AUTH_SERVICE_PORT || '4001', 10),
    customer: parseInt(process.env.CUSTOMER_SERVICE_PORT || '4002', 10),
    account: parseInt(process.env.ACCOUNT_SERVICE_PORT || '4003', 10),
    transaction: parseInt(process.env.TRANSACTION_SERVICE_PORT || '4004', 10),
    ledger: parseInt(process.env.LEDGER_SERVICE_PORT || '4005', 10),
    payment: parseInt(process.env.PAYMENT_SERVICE_PORT || '4006', 10),
    wallet: parseInt(process.env.WALLET_SERVICE_PORT || '4007', 10),
    beneficiary: parseInt(process.env.BENEFICIARY_SERVICE_PORT || '4008', 10),
    notification: parseInt(process.env.NOTIFICATION_SERVICE_PORT || '4009', 10),
    kycRisk: parseInt(process.env.KYC_RISK_SERVICE_PORT || '4010', 10),
    reporting: parseInt(process.env.REPORTING_SERVICE_PORT || '4011', 10),
  }
};
