import { OutboxEntityFactory } from '@banking/database';
export const AdmOutboxEntity = OutboxEntityFactory('adm');
export type AdmOutboxEntity = InstanceType<typeof AdmOutboxEntity>;
