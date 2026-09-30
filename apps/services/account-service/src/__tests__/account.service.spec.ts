/**
 * Account Service — Unit Tests
 *
 * Tests account lifecycle (creation, activation, suspension, closure),
 * account number generation, balance management, and multi-account rules.
 */

// ── Domain types (inline for isolation) ──────────────────────────────────────
enum AccountType {
  SAVINGS   = 'SAVINGS',
  CURRENT   = 'CURRENT',
  FIXED_DEPOSIT = 'FIXED_DEPOSIT',
  WALLET    = 'WALLET',
}

enum AccountStatus {
  PENDING   = 'PENDING',
  ACTIVE    = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CLOSED    = 'CLOSED',
}

enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  INR = 'INR',
}

interface Account {
  id:             string;
  accountNumber:  string;
  userId:         string;
  type:           AccountType;
  status:         AccountStatus;
  currency:       Currency;
  balance:        number;
  dailyLimit:     number;
  createdAt:      string;
  closedAt?:      string;
}

// ── AccountService ────────────────────────────────────────────────────────────
class AccountService {
  private accounts = new Map<string, Account>();
  private accountsByUser = new Map<string, Set<string>>();

  readonly MAX_ACTIVE_SAVINGS_PER_USER = 2;
  readonly MIN_CLOSING_BALANCE         = 0;

  private newId()       { return `acc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
  private genAccountNumber() {
    // Format: 10-digit numeric string
    return String(Math.floor(1_000_000_000 + Math.random() * 9_000_000_000));
  }

  async createAccount(dto: {
    userId:     string;
    type:       AccountType;
    currency:   Currency;
    dailyLimit?: number;
  }): Promise<Account> {
    // Business rule: max 2 active savings accounts per user
    if (dto.type === AccountType.SAVINGS) {
      const existing = this.getActiveAccountsByType(dto.userId, AccountType.SAVINGS);
      if (existing.length >= this.MAX_ACTIVE_SAVINGS_PER_USER) {
        throw new Error(`User already has ${this.MAX_ACTIVE_SAVINGS_PER_USER} active savings accounts`);
      }
    }

    const account: Account = {
      id:            this.newId(),
      accountNumber: this.genAccountNumber(),
      userId:        dto.userId,
      type:          dto.type,
      status:        AccountStatus.PENDING,
      currency:      dto.currency,
      balance:       0,
      dailyLimit:    dto.dailyLimit ?? 10_000,
      createdAt:     new Date().toISOString(),
    };

    this.accounts.set(account.id, account);
    if (!this.accountsByUser.has(dto.userId)) this.accountsByUser.set(dto.userId, new Set());
    this.accountsByUser.get(dto.userId)!.add(account.id);

    return account;
  }

  getActiveAccountsByType(userId: string, type: AccountType): Account[] {
    const ids = this.accountsByUser.get(userId) ?? new Set<string>();
    return Array.from(ids)
      .map(id => this.accounts.get(id)!)
      .filter(a => a && a.type === type && a.status === AccountStatus.ACTIVE);
  }

  async activate(accountId: string): Promise<Account> {
    const acc = this.getOrThrow(accountId);
    if (acc.status !== AccountStatus.PENDING) throw new Error(`Account must be PENDING to activate, got: ${acc.status}`);
    acc.status = AccountStatus.ACTIVE;
    return acc;
  }

  async suspend(accountId: string, reason: string): Promise<Account> {
    const acc = this.getOrThrow(accountId);
    if (acc.status === AccountStatus.CLOSED) throw new Error('Cannot suspend a closed account');
    if (!reason || reason.trim().length === 0) throw new Error('Suspension reason is required');
    acc.status = AccountStatus.SUSPENDED;
    return acc;
  }

  async reactivate(accountId: string): Promise<Account> {
    const acc = this.getOrThrow(accountId);
    if (acc.status !== AccountStatus.SUSPENDED) throw new Error('Only SUSPENDED accounts can be reactivated');
    acc.status = AccountStatus.ACTIVE;
    return acc;
  }

  async close(accountId: string): Promise<Account> {
    const acc = this.getOrThrow(accountId);
    if (acc.status === AccountStatus.CLOSED) throw new Error('Account is already closed');
    if (acc.balance > this.MIN_CLOSING_BALANCE) throw new Error(`Account has remaining balance of ${acc.balance}. Withdraw funds before closing.`);
    acc.status = AccountStatus.CLOSED;
    acc.closedAt = new Date().toISOString();
    return acc;
  }

  async updateDailyLimit(accountId: string, limit: number): Promise<Account> {
    if (limit < 0) throw new Error('Daily limit cannot be negative');
    const acc = this.getOrThrow(accountId);
    if (acc.status !== AccountStatus.ACTIVE) throw new Error('Only ACTIVE accounts can update daily limit');
    acc.dailyLimit = limit;
    return acc;
  }

  async creditBalance(accountId: string, amount: number): Promise<Account> {
    const acc = this.getOrThrow(accountId);
    if (acc.status !== AccountStatus.ACTIVE) throw new Error('Account is not ACTIVE');
    acc.balance = parseFloat((acc.balance + amount).toFixed(2));
    return acc;
  }

  async debitBalance(accountId: string, amount: number): Promise<Account> {
    const acc = this.getOrThrow(accountId);
    if (acc.status !== AccountStatus.ACTIVE) throw new Error('Account is not ACTIVE');
    if (amount > acc.dailyLimit) throw new Error(`Amount ${amount} exceeds daily limit ${acc.dailyLimit}`);
    if (amount > acc.balance) throw new Error(`Insufficient funds: balance ${acc.balance}`);
    acc.balance = parseFloat((acc.balance - amount).toFixed(2));
    return acc;
  }

  async getAccountsByUser(userId: string): Promise<Account[]> {
    const ids = this.accountsByUser.get(userId) ?? new Set<string>();
    return Array.from(ids).map(id => this.accounts.get(id)!).filter(Boolean);
  }

  private getOrThrow(accountId: string): Account {
    const acc = this.accounts.get(accountId);
    if (!acc) throw new Error(`Account ${accountId} not found`);
    return acc;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('AccountService Unit Tests', () => {
  let service: AccountService;
  const USER_A = 'user_alpha_001';
  const USER_B = 'user_beta_002';

  beforeEach(() => {
    service = new AccountService();
  });

  // ── Account creation ────────────────────────────────────────────────────────
  describe('createAccount()', () => {
    it('should create a SAVINGS account in PENDING status with 10-digit account number', async () => {
      const acc = await service.createAccount({ userId: USER_A, type: AccountType.SAVINGS, currency: Currency.USD });

      expect(acc.status).toBe(AccountStatus.PENDING);
      expect(acc.type).toBe(AccountType.SAVINGS);
      expect(acc.currency).toBe(Currency.USD);
      expect(acc.balance).toBe(0);
      expect(acc.accountNumber).toMatch(/^\d{10}$/);
    });

    it('should enforce max 2 active savings accounts per user', async () => {
      const a1 = await service.createAccount({ userId: USER_A, type: AccountType.SAVINGS, currency: Currency.USD });
      const a2 = await service.createAccount({ userId: USER_A, type: AccountType.SAVINGS, currency: Currency.USD });
      await service.activate(a1.id);
      await service.activate(a2.id);

      await expect(
        service.createAccount({ userId: USER_A, type: AccountType.SAVINGS, currency: Currency.USD }),
      ).rejects.toThrow('2 active savings accounts');
    });

    it('should allow unlimited CURRENT accounts', async () => {
      const c1 = await service.createAccount({ userId: USER_A, type: AccountType.CURRENT, currency: Currency.USD });
      const c2 = await service.createAccount({ userId: USER_A, type: AccountType.CURRENT, currency: Currency.USD });
      const c3 = await service.createAccount({ userId: USER_A, type: AccountType.CURRENT, currency: Currency.USD });
      expect([c1, c2, c3]).toHaveLength(3);
    });

    it('should apply custom daily limit when provided', async () => {
      const acc = await service.createAccount({ userId: USER_A, type: AccountType.SAVINGS, currency: Currency.INR, dailyLimit: 50_000 });
      expect(acc.dailyLimit).toBe(50_000);
    });
  });

  // ── Lifecycle transitions ───────────────────────────────────────────────────
  describe('Account lifecycle', () => {
    it('PENDING → ACTIVE via activate()', async () => {
      const acc = await service.createAccount({ userId: USER_A, type: AccountType.SAVINGS, currency: Currency.USD });
      const activated = await service.activate(acc.id);
      expect(activated.status).toBe(AccountStatus.ACTIVE);
    });

    it('cannot activate an already-ACTIVE account', async () => {
      const acc = await service.createAccount({ userId: USER_A, type: AccountType.SAVINGS, currency: Currency.USD });
      await service.activate(acc.id);
      await expect(service.activate(acc.id)).rejects.toThrow('PENDING to activate');
    });

    it('ACTIVE → SUSPENDED → ACTIVE (reactivate)', async () => {
      const acc = await service.createAccount({ userId: USER_A, type: AccountType.SAVINGS, currency: Currency.USD });
      await service.activate(acc.id);
      await service.suspend(acc.id, 'Suspicious activity detected');
      const reactivated = await service.reactivate(acc.id);
      expect(reactivated.status).toBe(AccountStatus.ACTIVE);
    });

    it('should require a reason for suspension', async () => {
      const acc = await service.createAccount({ userId: USER_A, type: AccountType.SAVINGS, currency: Currency.USD });
      await service.activate(acc.id);
      await expect(service.suspend(acc.id, '')).rejects.toThrow('reason is required');
    });

    it('ACTIVE → CLOSED when balance is zero', async () => {
      const acc = await service.createAccount({ userId: USER_A, type: AccountType.SAVINGS, currency: Currency.USD });
      await service.activate(acc.id);
      const closed = await service.close(acc.id);
      expect(closed.status).toBe(AccountStatus.CLOSED);
      expect(closed.closedAt).toBeDefined();
    });

    it('should reject closing account with remaining balance', async () => {
      const acc = await service.createAccount({ userId: USER_A, type: AccountType.SAVINGS, currency: Currency.USD });
      await service.activate(acc.id);
      await service.creditBalance(acc.id, 100);
      await expect(service.close(acc.id)).rejects.toThrow('remaining balance');
    });
  });

  // ── Balance management ──────────────────────────────────────────────────────
  describe('Balance management', () => {
    let activeAcc: Account;

    beforeEach(async () => {
      activeAcc = await service.createAccount({ userId: USER_A, type: AccountType.SAVINGS, currency: Currency.USD });
      await service.activate(activeAcc.id);
      await service.creditBalance(activeAcc.id, 1000);
    });

    it('should credit and increase balance correctly', async () => {
      await service.creditBalance(activeAcc.id, 250.50);
      const acc = (await service.getAccountsByUser(USER_A))[0];
      expect(acc.balance).toBe(1250.50);
    });

    it('should debit and decrease balance correctly', async () => {
      await service.debitBalance(activeAcc.id, 400);
      const acc = (await service.getAccountsByUser(USER_A))[0];
      expect(acc.balance).toBe(600);
    });

    it('should reject debit exceeding account balance', async () => {
      await expect(service.debitBalance(activeAcc.id, 2000)).rejects.toThrow('Insufficient funds');
    });

    it('should reject debit exceeding daily limit', async () => {
      await service.updateDailyLimit(activeAcc.id, 500);
      await expect(service.debitBalance(activeAcc.id, 600)).rejects.toThrow('daily limit');
    });

    it('should reject balance operations on suspended accounts', async () => {
      await service.suspend(activeAcc.id, 'Test suspension');
      await expect(service.creditBalance(activeAcc.id, 100)).rejects.toThrow('not ACTIVE');
      await expect(service.debitBalance(activeAcc.id, 100)).rejects.toThrow('not ACTIVE');
    });
  });

  // ── User account listing ────────────────────────────────────────────────────
  describe('getAccountsByUser()', () => {
    it('should return all accounts belonging to the user', async () => {
      await service.createAccount({ userId: USER_A, type: AccountType.SAVINGS, currency: Currency.USD });
      await service.createAccount({ userId: USER_A, type: AccountType.CURRENT, currency: Currency.EUR });
      await service.createAccount({ userId: USER_B, type: AccountType.SAVINGS, currency: Currency.USD });

      const userAAccounts = await service.getAccountsByUser(USER_A);
      expect(userAAccounts).toHaveLength(2);
      expect(userAAccounts.every(a => a.userId === USER_A)).toBe(true);
    });

    it('should return empty array for user with no accounts', async () => {
      expect(await service.getAccountsByUser('user_nobody')).toHaveLength(0);
    });
  });
});
