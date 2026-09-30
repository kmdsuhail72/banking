import { join } from 'path';
import { Transport, ClientProviderOptions } from '@nestjs/microservices';

export const GRPC_PACKAGES = {
  AUTH:               'banking.auth',
  CUSTOMER:           'banking.customer',
  ACCOUNT:            'banking.account',
  TRANSACTION:        'banking.transaction',
  LEDGER:             'banking.ledger',
  PAYMENT:            'banking.payment',
  WALLET:             'banking.wallet',
  BENEFICIARY:        'banking.beneficiary',
  NOTIFICATION:       'banking.notification',
  KYC_RISK:           'banking.kyc_risk',
  REPORTING:          'banking.reporting',
  AUTHZ:              'banking.authz',
  CARD:               'banking.card',
  LOAN:               'banking.loan',
  EMI:                'banking.emi',
  FIXED_DEPOSIT:      'banking.fixed_deposit',
  RECURRING_DEPOSIT:  'banking.recurring_deposit',
  FRAUD:              'banking.fraud',
  COMPLIANCE:         'banking.compliance',
  AUDIT:              'banking.audit',
  LIMIT:              'banking.limit',
  INTEREST:           'banking.interest',
  STATEMENT:          'banking.statement',
  SUPPORT:            'banking.support',
  ANALYTICS:          'banking.analytics',
  FEE:                'banking.fee',
  EXCHANGE:           'banking.exchange',
  DOCUMENT:           'banking.document',
  SCHEDULER:          'banking.scheduler',
  ADMIN:              'banking.admin',
} as const;

export const DEFAULT_GRPC_PORTS = {
  AUTH:               50051,
  CUSTOMER:           50052,
  ACCOUNT:            50053,
  TRANSACTION:        50054,
  LEDGER:             50055,
  PAYMENT:            50056,
  WALLET:             50057,
  BENEFICIARY:        50058,
  NOTIFICATION:       50059,
  KYC_RISK:           50060,
  REPORTING:          50061,
  AUTHZ:              50062,
  CARD:               50063,
  LOAN:               50064,
  EMI:                50065,
  FIXED_DEPOSIT:      50066,
  RECURRING_DEPOSIT:  50067,
  FRAUD:              50068,
  COMPLIANCE:         50069,
  AUDIT:              50070,
  LIMIT:              50071,
  INTEREST:           50072,
  STATEMENT:          50073,
  SUPPORT:            50074,
  ANALYTICS:          50075,
  FEE:                50076,
  EXCHANGE:           50077,
  DOCUMENT:           50078,
  SCHEDULER:          50079,
  ADMIN:              50080,
} as const;

export type GrpcServiceKey = keyof typeof DEFAULT_GRPC_PORTS;

const PROTO_DIR = join(__dirname, '..', 'proto');

/**
 * Builds a NestJS ClientProviderOptions for a gRPC client.
 * Usage:
 *   ClientsModule.register([grpcClient('AUTH', process.env.AUTH_GRPC_URL)])
 */
export function grpcClient(
  service: GrpcServiceKey,
  url?: string,
): ClientProviderOptions {
  const pkg = GRPC_PACKAGES[service];
  const defaultPort = DEFAULT_GRPC_PORTS[service];
  const protoFile = `${service.toLowerCase().replace(/_/g, '-')}.proto`;

  return {
    name: `${service}_GRPC_CLIENT`,
    transport: Transport.GRPC,
    options: {
      url: url ?? `${process.env[`${service}_GRPC_HOST`] ?? 'localhost'}:${defaultPort}`,
      package: pkg,
      protoPath: join(PROTO_DIR, protoFile),
    },
  };
}

export interface IGrpcClientOptions {
  url: string;
  package: string;
  protoPath: string;
}
