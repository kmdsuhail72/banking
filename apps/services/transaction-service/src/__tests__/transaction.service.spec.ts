/**
 * Transaction Service — Unit Tests
 *
 * Tests transaction recording, ledger consistency,
 * balance calculation, and idempotent debit/credit logic.
 */

// ── Domain types (inline for isolation) ──────────────────────────────────────
enum TransactionType {
  CREDIT = "CREDIT",
  DEBIT = "DEBIT",
}

enum TransactionStatus {
  PENDING = "PENDING",
  POSTED = "POSTED",
  REVERSED = "REVERSED",
  FAILED = "FAILED",
}

interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  referenceId: string; // idempotency / payment linkage
  description: string;
  balanceAfter: number;
  createdAt: string;
}

// ── Lightweight TransactionService (pure business logic) ──────────────────────
class TransactionService {
  private txns = new Map<string, Transaction>();
  private refs = new Set<string>(); // idempotency
  private balances = new Map<string, number>(); // accountId → balance

  setBalance(accountId: string, balance: number) {
    this.balances.set(accountId, balance);
  }

  getBalance(accountId: string): number {
    return this.balances.get(accountId) ?? 0;
  }

  private newId() {
    return `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  async recordCredit(dto: {
    referenceId: string;
    accountId: string;
    amount: number;
    currency: string;
    description: string;
  }): Promise<Transaction> {
    if (dto.amount <= 0) throw new Error("Credit amount must be positive");
    if (this.refs.has(dto.referenceId))
      throw new Error(`Duplicate referenceId: ${dto.referenceId}`);

    const current = this.getBalance(dto.accountId);
    const next = parseFloat((current + dto.amount).toFixed(2));
    this.setBalance(dto.accountId, next);
    this.refs.add(dto.referenceId);

    const txn: Transaction = {
      id: this.newId(),
      accountId: dto.accountId,
      type: TransactionType.CREDIT,
      amount: dto.amount,
      currency: dto.currency,
      status: TransactionStatus.POSTED,
      referenceId: dto.referenceId,
      description: dto.description,
      balanceAfter: next,
      createdAt: new Date().toISOString(),
    };
    this.txns.set(txn.id, txn);
    return txn;
  }

  async recordDebit(dto: {
    referenceId: string;
    accountId: string;
    amount: number;
    currency: string;
    description: string;
  }): Promise<Transaction> {
    if (dto.amount <= 0) throw new Error("Debit amount must be positive");
    if (this.refs.has(dto.referenceId))
      throw new Error(`Duplicate referenceId: ${dto.referenceId}`);

    const current = this.getBalance(dto.accountId);
    if (current < dto.amount) {
      throw new Error(
        `Insufficient funds: balance ${current}, requested ${dto.amount}`,
      );
    }

    const next = parseFloat((current - dto.amount).toFixed(2));
    this.setBalance(dto.accountId, next);
    this.refs.add(dto.referenceId);

    const txn: Transaction = {
      id: this.newId(),
      accountId: dto.accountId,
      type: TransactionType.DEBIT,
      amount: dto.amount,
      currency: dto.currency,
      status: TransactionStatus.POSTED,
      referenceId: dto.referenceId,
      description: dto.description,
      balanceAfter: next,
      createdAt: new Date().toISOString(),
    };
    this.txns.set(txn.id, txn);
    return txn;
  }

  async reverseTransaction(txnId: string): Promise<Transaction> {
    const txn = this.txns.get(txnId);
    if (!txn) throw new Error(`Transaction ${txnId} not found`);
    if (txn.status === TransactionStatus.REVERSED)
      throw new Error("Already reversed");
    if (txn.status !== TransactionStatus.POSTED)
      throw new Error("Only POSTED transactions can be reversed");

    // Invert effect on balance
    if (txn.type === TransactionType.DEBIT) {
      this.setBalance(
        txn.accountId,
        this.getBalance(txn.accountId) + txn.amount,
      );
    } else {
      this.setBalance(
        txn.accountId,
        this.getBalance(txn.accountId) - txn.amount,
      );
    }
    txn.status = TransactionStatus.REVERSED;
    return txn;
  }

  async getHistory(accountId: string): Promise<Transaction[]> {
    return Array.from(this.txns.values())
      .filter((t) => t.accountId === accountId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("TransactionService Unit Tests", () => {
  let service: TransactionService;
  const ACCOUNT_A = "acc_alpha_001";
  const ACCOUNT_B = "acc_beta_002";

  beforeEach(() => {
    service = new TransactionService();
    service.setBalance(ACCOUNT_A, 1000.0);
    service.setBalance(ACCOUNT_B, 500.0);
  });

  // ── Credit ──────────────────────────────────────────────────────────────────
  describe("recordCredit()", () => {
    it("should post a CREDIT and increase the account balance", async () => {
      const txn = await service.recordCredit({
        referenceId: "ref-cr-001",
        accountId: ACCOUNT_A,
        amount: 250.0,
        currency: "USD",
        description: "Salary deposit",
      });

      expect(txn.type).toBe(TransactionType.CREDIT);
      expect(txn.status).toBe(TransactionStatus.POSTED);
      expect(txn.balanceAfter).toBe(1250.0);
      expect(service.getBalance(ACCOUNT_A)).toBe(1250.0);
    });

    it("should reject credits with zero or negative amount", async () => {
      await expect(
        service.recordCredit({
          referenceId: "ref-cr-zero",
          accountId: ACCOUNT_A,
          amount: 0,
          currency: "USD",
          description: "",
        }),
      ).rejects.toThrow("Credit amount must be positive");

      await expect(
        service.recordCredit({
          referenceId: "ref-cr-neg",
          accountId: ACCOUNT_A,
          amount: -50,
          currency: "USD",
          description: "",
        }),
      ).rejects.toThrow("Credit amount must be positive");
    });

    it("should reject duplicate referenceId (idempotency)", async () => {
      await service.recordCredit({
        referenceId: "ref-dup",
        accountId: ACCOUNT_A,
        amount: 100,
        currency: "USD",
        description: "",
      });
      await expect(
        service.recordCredit({
          referenceId: "ref-dup",
          accountId: ACCOUNT_A,
          amount: 100,
          currency: "USD",
          description: "",
        }),
      ).rejects.toThrow("Duplicate referenceId");
    });

    it("should track balance precisely for multiple sequential credits", async () => {
      await service.recordCredit({
        referenceId: "cr-a",
        accountId: ACCOUNT_A,
        amount: 100.5,
        currency: "USD",
        description: "",
      });
      await service.recordCredit({
        referenceId: "cr-b",
        accountId: ACCOUNT_A,
        amount: 49.5,
        currency: "USD",
        description: "",
      });
      expect(service.getBalance(ACCOUNT_A)).toBe(1150.0);
    });
  });

  // ── Debit ───────────────────────────────────────────────────────────────────
  describe("recordDebit()", () => {
    it("should post a DEBIT and decrease the account balance", async () => {
      const txn = await service.recordDebit({
        referenceId: "ref-db-001",
        accountId: ACCOUNT_A,
        amount: 300.0,
        currency: "USD",
        description: "Online purchase",
      });

      expect(txn.type).toBe(TransactionType.DEBIT);
      expect(txn.status).toBe(TransactionStatus.POSTED);
      expect(txn.balanceAfter).toBe(700.0);
      expect(service.getBalance(ACCOUNT_A)).toBe(700.0);
    });

    it("should reject debit when insufficient funds", async () => {
      await expect(
        service.recordDebit({
          referenceId: "ref-nsf",
          accountId: ACCOUNT_A,
          amount: 1500.0,
          currency: "USD",
          description: "Over limit",
        }),
      ).rejects.toThrow("Insufficient funds");
    });

    it("should allow debit that exactly empties the account", async () => {
      const txn = await service.recordDebit({
        referenceId: "ref-full-drain",
        accountId: ACCOUNT_A,
        amount: 1000.0,
        currency: "USD",
        description: "Full withdrawal",
      });
      expect(txn.balanceAfter).toBe(0.0);
    });
  });

  // ── Transfer ledger consistency ──────────────────────────────────────────────
  describe("Double-entry ledger consistency", () => {
    it("should keep sum of balances constant across a transfer", async () => {
      const before =
        service.getBalance(ACCOUNT_A) + service.getBalance(ACCOUNT_B);
      const transferAmount = 200;

      await service.recordDebit({
        referenceId: "tr-d",
        accountId: ACCOUNT_A,
        amount: transferAmount,
        currency: "USD",
        description: "",
      });
      await service.recordCredit({
        referenceId: "tr-c",
        accountId: ACCOUNT_B,
        amount: transferAmount,
        currency: "USD",
        description: "",
      });

      const after =
        service.getBalance(ACCOUNT_A) + service.getBalance(ACCOUNT_B);
      expect(after).toBe(before);
    });
  });

  // ── Reversal ────────────────────────────────────────────────────────────────
  describe("reverseTransaction()", () => {
    it("should reverse a CREDIT and restore the balance", async () => {
      const txn = await service.recordCredit({
        referenceId: "rc-rev",
        accountId: ACCOUNT_A,
        amount: 100,
        currency: "USD",
        description: "",
      });
      await service.reverseTransaction(txn.id);
      expect(service.getBalance(ACCOUNT_A)).toBe(1000.0);
    });

    it("should reverse a DEBIT and restore the balance", async () => {
      const txn = await service.recordDebit({
        referenceId: "rd-rev",
        accountId: ACCOUNT_A,
        amount: 100,
        currency: "USD",
        description: "",
      });
      await service.reverseTransaction(txn.id);
      expect(service.getBalance(ACCOUNT_A)).toBe(1000.0);
    });

    it("should prevent double-reversal", async () => {
      const txn = await service.recordCredit({
        referenceId: "rc-rev2",
        accountId: ACCOUNT_A,
        amount: 100,
        currency: "USD",
        description: "",
      });
      await service.reverseTransaction(txn.id);
      await expect(service.reverseTransaction(txn.id)).rejects.toThrow(
        "Already reversed",
      );
    });

    it("should throw for non-existent txnId", async () => {
      await expect(service.reverseTransaction("txn_ghost")).rejects.toThrow(
        "not found",
      );
    });
  });

  // ── History ─────────────────────────────────────────────────────────────────
  describe("getHistory()", () => {
    it("should return all transactions for a given account in chronological order", async () => {
      await service.recordCredit({
        referenceId: "h1",
        accountId: ACCOUNT_A,
        amount: 50,
        currency: "USD",
        description: "",
      });
      await service.recordDebit({
        referenceId: "h2",
        accountId: ACCOUNT_A,
        amount: 20,
        currency: "USD",
        description: "",
      });
      await service.recordCredit({
        referenceId: "h3",
        accountId: ACCOUNT_B,
        amount: 200,
        currency: "USD",
        description: "",
      });

      const history = await service.getHistory(ACCOUNT_A);
      expect(history).toHaveLength(2);
      expect(history[0].type).toBe(TransactionType.CREDIT);
      expect(history[1].type).toBe(TransactionType.DEBIT);
    });
  });
});
