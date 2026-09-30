/**
 * Notification Service — Unit Tests
 *
 * Tests notification dispatch, channel routing (email/SMS/push),
 * retry logic, deduplication, and template rendering.
 */

// ── Channel & type enums (inline) ─────────────────────────────────────────────
enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS   = 'SMS',
  PUSH  = 'PUSH',
  IN_APP = 'IN_APP',
}

enum NotificationStatus {
  QUEUED    = 'QUEUED',
  SENT      = 'SENT',
  FAILED    = 'FAILED',
  RETRYING  = 'RETRYING',
}

enum NotificationTemplate {
  OTP_VERIFICATION   = 'OTP_VERIFICATION',
  PAYMENT_CONFIRMED  = 'PAYMENT_CONFIRMED',
  PAYMENT_FAILED     = 'PAYMENT_FAILED',
  ACCOUNT_CREATED    = 'ACCOUNT_CREATED',
  SUSPICIOUS_LOGIN   = 'SUSPICIOUS_LOGIN',
  LOW_BALANCE_ALERT  = 'LOW_BALANCE_ALERT',
}

interface NotificationRecord {
  id:          string;
  userId:      string;
  channel:     NotificationChannel;
  template:    NotificationTemplate;
  status:      NotificationStatus;
  attempts:    number;
  payload:     Record<string, string | number>;
  sentAt?:     string;
  createdAt:   string;
}

// ── Template renderer ─────────────────────────────────────────────────────────
const TEMPLATES: Record<NotificationTemplate, (p: Record<string, string | number>) => string> = {
  [NotificationTemplate.OTP_VERIFICATION]:   (p) => `Your OTP is ${p.otp}. Expires in ${p.expiryMinutes} minutes. Do not share with anyone.`,
  [NotificationTemplate.PAYMENT_CONFIRMED]:  (p) => `Payment of ${p.currency} ${p.amount} to ${p.recipientName} confirmed. Ref: ${p.referenceId}`,
  [NotificationTemplate.PAYMENT_FAILED]:     (p) => `Payment of ${p.currency} ${p.amount} failed. Reason: ${p.reason}. Please retry or contact support.`,
  [NotificationTemplate.ACCOUNT_CREATED]:    (p) => `Welcome to NovaBanks, ${p.firstName}! Your account ${p.accountNumber} is now active.`,
  [NotificationTemplate.SUSPICIOUS_LOGIN]:   (p) => `Suspicious login detected from ${p.location} at ${p.time}. If this wasn't you, contact support immediately.`,
  [NotificationTemplate.LOW_BALANCE_ALERT]:  (p) => `Low balance alert: Your account balance is ${p.currency} ${p.balance}, below your threshold of ${p.threshold}.`,
};

// ── NotificationService ───────────────────────────────────────────────────────
class NotificationService {
  private notifications = new Map<string, NotificationRecord>();
  private dedupeKeys    = new Set<string>();
  private failChannels  = new Set<NotificationChannel>(); // simulated failures
  readonly MAX_RETRIES  = 3;

  simulateChannelFailure(channel: NotificationChannel) {
    this.failChannels.add(channel);
  }

  private newId() {
    return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  renderTemplate(template: NotificationTemplate, payload: Record<string, string | number>): string {
    const renderer = TEMPLATES[template];
    if (!renderer) throw new Error(`Unknown template: ${template}`);
    return renderer(payload);
  }

  async send(dto: {
    userId:      string;
    channel:     NotificationChannel;
    template:    NotificationTemplate;
    payload:     Record<string, string | number>;
    dedupeKey?:  string;
  }): Promise<NotificationRecord> {
    // Deduplication
    if (dto.dedupeKey && this.dedupeKeys.has(dto.dedupeKey)) {
      throw new Error(`Duplicate notification: ${dto.dedupeKey}`);
    }

    const record: NotificationRecord = {
      id:        this.newId(),
      userId:    dto.userId,
      channel:   dto.channel,
      template:  dto.template,
      status:    NotificationStatus.QUEUED,
      attempts:  0,
      payload:   dto.payload,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(record.id, record);

    if (dto.dedupeKey) this.dedupeKeys.add(dto.dedupeKey);

    // Dispatch
    await this._dispatch(record);
    return record;
  }

  private async _dispatch(record: NotificationRecord) {
    record.attempts++;
    if (this.failChannels.has(record.channel)) {
      record.status = NotificationStatus.FAILED;
    } else {
      record.status = NotificationStatus.SENT;
      record.sentAt = new Date().toISOString();
    }
  }

  async retry(notificationId: string): Promise<NotificationRecord> {
    const record = this.notifications.get(notificationId);
    if (!record) throw new Error(`Notification ${notificationId} not found`);
    if (record.status !== NotificationStatus.FAILED) throw new Error('Only FAILED notifications can be retried');
    if (record.attempts >= this.MAX_RETRIES) throw new Error(`Max retries (${this.MAX_RETRIES}) exceeded`);

    record.status = NotificationStatus.RETRYING;
    await this._dispatch(record);
    return record;
  }

  async getByUser(userId: string): Promise<NotificationRecord[]> {
    return Array.from(this.notifications.values()).filter(n => n.userId === userId);
  }

  async getById(id: string): Promise<NotificationRecord> {
    const n = this.notifications.get(id);
    if (!n) throw new Error(`Notification ${id} not found`);
    return n;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('NotificationService Unit Tests', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
  });

  // ── Template rendering ───────────────────────────────────────────────────────
  describe('renderTemplate()', () => {
    it('should render OTP template with correct values', () => {
      const msg = service.renderTemplate(NotificationTemplate.OTP_VERIFICATION, { otp: '847392', expiryMinutes: 10 });
      expect(msg).toContain('847392');
      expect(msg).toContain('10 minutes');
      expect(msg).toContain('Do not share');
    });

    it('should render PAYMENT_CONFIRMED with amount and recipient', () => {
      const msg = service.renderTemplate(NotificationTemplate.PAYMENT_CONFIRMED, {
        currency: 'USD', amount: 500, recipientName: 'Jane Doe', referenceId: 'PAY-001',
      });
      expect(msg).toContain('500');
      expect(msg).toContain('Jane Doe');
      expect(msg).toContain('PAY-001');
    });

    it('should render LOW_BALANCE_ALERT with threshold', () => {
      const msg = service.renderTemplate(NotificationTemplate.LOW_BALANCE_ALERT, {
        currency: 'USD', balance: 45.00, threshold: 100,
      });
      expect(msg).toContain('45');
      expect(msg).toContain('100');
    });

    it('should throw for an unknown template', () => {
      expect(() => service.renderTemplate('INVALID_TEMPLATE' as NotificationTemplate, {}))
        .toThrow('Unknown template');
    });
  });

  // ── Send — success paths ─────────────────────────────────────────────────────
  describe('send() — success paths', () => {
    it('should send an EMAIL notification and mark as SENT', async () => {
      const record = await service.send({
        userId:   'user_001',
        channel:  NotificationChannel.EMAIL,
        template: NotificationTemplate.OTP_VERIFICATION,
        payload:  { otp: '123456', expiryMinutes: 5 },
      });

      expect(record.status).toBe(NotificationStatus.SENT);
      expect(record.sentAt).toBeDefined();
      expect(record.attempts).toBe(1);
    });

    it('should send an SMS notification', async () => {
      const record = await service.send({
        userId:   'user_001',
        channel:  NotificationChannel.SMS,
        template: NotificationTemplate.OTP_VERIFICATION,
        payload:  { otp: '654321', expiryMinutes: 3 },
      });
      expect(record.status).toBe(NotificationStatus.SENT);
      expect(record.channel).toBe(NotificationChannel.SMS);
    });

    it('should send a PUSH notification', async () => {
      const record = await service.send({
        userId:   'user_002',
        channel:  NotificationChannel.PUSH,
        template: NotificationTemplate.LOW_BALANCE_ALERT,
        payload:  { currency: 'USD', balance: 20, threshold: 100 },
      });
      expect(record.status).toBe(NotificationStatus.SENT);
    });
  });

  // ── Deduplication ────────────────────────────────────────────────────────────
  describe('Deduplication', () => {
    it('should reject duplicate notification with same dedupeKey', async () => {
      await service.send({
        userId: 'user_001', channel: NotificationChannel.EMAIL,
        template: NotificationTemplate.OTP_VERIFICATION,
        payload: { otp: '111111', expiryMinutes: 5 },
        dedupeKey: 'otp-user_001-session-abc',
      });

      await expect(service.send({
        userId: 'user_001', channel: NotificationChannel.EMAIL,
        template: NotificationTemplate.OTP_VERIFICATION,
        payload: { otp: '222222', expiryMinutes: 5 },
        dedupeKey: 'otp-user_001-session-abc',
      })).rejects.toThrow('Duplicate notification');
    });

    it('should allow same template with different dedupeKeys', async () => {
      const r1 = await service.send({ userId: 'u1', channel: NotificationChannel.EMAIL, template: NotificationTemplate.OTP_VERIFICATION, payload: { otp: '1', expiryMinutes: 5 }, dedupeKey: 'k1' });
      const r2 = await service.send({ userId: 'u1', channel: NotificationChannel.EMAIL, template: NotificationTemplate.OTP_VERIFICATION, payload: { otp: '2', expiryMinutes: 5 }, dedupeKey: 'k2' });
      expect(r1.id).not.toBe(r2.id);
    });
  });

  // ── Failure & retry ──────────────────────────────────────────────────────────
  describe('Channel failure & retry', () => {
    it('should mark notification as FAILED when channel is unavailable', async () => {
      service.simulateChannelFailure(NotificationChannel.SMS);
      const record = await service.send({
        userId: 'user_001', channel: NotificationChannel.SMS,
        template: NotificationTemplate.OTP_VERIFICATION,
        payload: { otp: '999', expiryMinutes: 5 },
      });
      expect(record.status).toBe(NotificationStatus.FAILED);
    });

    it('should allow retry of a FAILED notification', async () => {
      service.simulateChannelFailure(NotificationChannel.SMS);
      const failed = await service.send({
        userId: 'u1', channel: NotificationChannel.SMS,
        template: NotificationTemplate.OTP_VERIFICATION,
        payload: { otp: '000', expiryMinutes: 5 },
      });

      // Fix the channel and retry
      service['failChannels'].delete(NotificationChannel.SMS);
      const retried = await service.retry(failed.id);
      expect(retried.status).toBe(NotificationStatus.SENT);
      expect(retried.attempts).toBe(2);
    });

    it('should not allow retrying a SENT notification', async () => {
      const sent = await service.send({
        userId: 'u1', channel: NotificationChannel.EMAIL,
        template: NotificationTemplate.OTP_VERIFICATION,
        payload: { otp: '111', expiryMinutes: 5 },
      });
      await expect(service.retry(sent.id)).rejects.toThrow('Only FAILED notifications can be retried');
    });

    it('should enforce max retry limit', async () => {
      service.simulateChannelFailure(NotificationChannel.SMS);
      const record = await service.send({
        userId: 'u1', channel: NotificationChannel.SMS,
        template: NotificationTemplate.OTP_VERIFICATION,
        payload: { otp: '000', expiryMinutes: 5 },
      });

      // exhaust retries
      for (let i = 0; i < service.MAX_RETRIES - 1; i++) {
        await service.retry(record.id);
      }
      await expect(service.retry(record.id)).rejects.toThrow('Max retries');
    });
  });

  // ── User notification history ────────────────────────────────────────────────
  describe('getByUser()', () => {
    it('should return all notifications for a user', async () => {
      await service.send({ userId: 'user_A', channel: NotificationChannel.EMAIL, template: NotificationTemplate.OTP_VERIFICATION, payload: { otp: '1', expiryMinutes: 5 } });
      await service.send({ userId: 'user_A', channel: NotificationChannel.SMS,   template: NotificationTemplate.PAYMENT_CONFIRMED, payload: { currency: 'USD', amount: 100, recipientName: 'Bob', referenceId: 'R1' } });
      await service.send({ userId: 'user_B', channel: NotificationChannel.PUSH,  template: NotificationTemplate.LOW_BALANCE_ALERT, payload: { currency: 'USD', balance: 50, threshold: 100 } });

      const notifs = await service.getByUser('user_A');
      expect(notifs).toHaveLength(2);
      expect(notifs.every(n => n.userId === 'user_A')).toBe(true);
    });

    it('should return empty array for user with no notifications', async () => {
      const notifs = await service.getByUser('user_nobody');
      expect(notifs).toHaveLength(0);
    });
  });
});
