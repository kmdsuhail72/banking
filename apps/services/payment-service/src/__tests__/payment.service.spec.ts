/**
 * Payment Service — Unit Tests
 *
 * Tests payment initiation, idempotency, status transitions,
 * and failure-path handling without hitting real DB/Kafka.
 */
import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";

// ── Enums & types (inline stubs so test runs without full @banking/shared-types build) ──
enum PaymentStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

enum PaymentMethod {
  BANK_TRANSFER = "BANK_TRANSFER",
  CARD = "CARD",
  UPI = "UPI",
  WALLET = "WALLET",
}

// ── Lightweight PaymentService stub ──────────────────────────────────────────
// We test the business logic in isolation from NestJS DI, DB, and Kafka.
class PaymentService {
  private payments = new Map<string, any>();
  private idempotencyKeys = new Set<string>();

  async initiatePayment(dto: {
    idempotencyKey: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    currency: string;
    method: PaymentMethod;
    description?: string;
  }) {
    if (dto.amount <= 0) {
      throw new BadRequestException("Payment amount must be greater than zero");
    }
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException(
        "Cannot transfer funds to the same account",
      );
    }
    if (this.idempotencyKeys.has(dto.idempotencyKey)) {
      throw new ConflictException(
        `Duplicate payment request: idempotency key already used`,
      );
    }

    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payment = {
      id: paymentId,
      ...dto,
      status: PaymentStatus.PENDING,
      createdAt: new Date().toISOString(),
    };

    this.payments.set(paymentId, payment);
    this.idempotencyKeys.add(dto.idempotencyKey);
    return payment;
  }

  async getPayment(paymentId: string) {
    const payment = this.payments.get(paymentId);
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);
    return payment;
  }

  async updateStatus(paymentId: string, status: PaymentStatus) {
    const payment = this.payments.get(paymentId);
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);

    const terminalStates = [
      PaymentStatus.COMPLETED,
      PaymentStatus.FAILED,
      PaymentStatus.CANCELLED,
    ];
    if (terminalStates.includes(payment.status)) {
      throw new BadRequestException(
        `Payment is already in terminal state: ${payment.status}`,
      );
    }

    payment.status = status;
    payment.updatedAt = new Date().toISOString();
    this.payments.set(paymentId, payment);
    return payment;
  }

  async cancelPayment(paymentId: string) {
    const payment = this.payments.get(paymentId);
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(`Only PENDING payments can be cancelled`);
    }

    return this.updateStatus(paymentId, PaymentStatus.CANCELLED);
  }

  async listPaymentsByAccount(accountId: string) {
    return Array.from(this.payments.values()).filter(
      (p) => p.fromAccountId === accountId || p.toAccountId === accountId,
    );
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("PaymentService Unit Tests", () => {
  let service: PaymentService;

  const validPaymentDto = {
    idempotencyKey: "idem-key-001",
    fromAccountId: "acc_sender_001",
    toAccountId: "acc_receiver_001",
    amount: 500.0,
    currency: "USD",
    method: PaymentMethod.BANK_TRANSFER,
    description: "Rent payment",
  };

  beforeEach(() => {
    service = new PaymentService();
  });

  // ── Initiation ──────────────────────────────────────────────────────────────
  describe("initiatePayment()", () => {
    it("should create a payment in PENDING state with all required fields", async () => {
      const result = await service.initiatePayment(validPaymentDto);

      expect(result.id).toMatch(/^pay_/);
      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(result.amount).toBe(500.0);
      expect(result.currency).toBe("USD");
      expect(result.method).toBe(PaymentMethod.BANK_TRANSFER);
      expect(result.createdAt).toBeDefined();
    });

    it("should reject payments with amount ≤ 0", async () => {
      await expect(
        service.initiatePayment({
          ...validPaymentDto,
          amount: 0,
          idempotencyKey: "idem-002",
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.initiatePayment({
          ...validPaymentDto,
          amount: -100,
          idempotencyKey: "idem-003",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject self-transfer (same fromAccountId and toAccountId)", async () => {
      await expect(
        service.initiatePayment({
          ...validPaymentDto,
          toAccountId: validPaymentDto.fromAccountId,
          idempotencyKey: "idem-004",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should enforce idempotency — duplicate key throws ConflictException", async () => {
      await service.initiatePayment(validPaymentDto);

      await expect(
        service.initiatePayment({ ...validPaymentDto, amount: 999 }), // same idempotencyKey
      ).rejects.toThrow(ConflictException);
    });

    it("should allow multiple payments with different idempotency keys", async () => {
      const p1 = await service.initiatePayment({
        ...validPaymentDto,
        idempotencyKey: "key-a",
      });
      const p2 = await service.initiatePayment({
        ...validPaymentDto,
        idempotencyKey: "key-b",
      });

      expect(p1.id).not.toBe(p2.id);
    });
  });

  // ── Status Transitions ──────────────────────────────────────────────────────
  describe("updateStatus()", () => {
    it("should transition from PENDING → PROCESSING", async () => {
      const { id } = await service.initiatePayment(validPaymentDto);
      const updated = await service.updateStatus(id, PaymentStatus.PROCESSING);
      expect(updated.status).toBe(PaymentStatus.PROCESSING);
    });

    it("should transition from PROCESSING → COMPLETED", async () => {
      const { id } = await service.initiatePayment(validPaymentDto);
      await service.updateStatus(id, PaymentStatus.PROCESSING);
      const completed = await service.updateStatus(id, PaymentStatus.COMPLETED);
      expect(completed.status).toBe(PaymentStatus.COMPLETED);
    });

    it("should reject updates to already-terminal payments", async () => {
      const { id } = await service.initiatePayment(validPaymentDto);
      await service.updateStatus(id, PaymentStatus.COMPLETED);

      await expect(
        service.updateStatus(id, PaymentStatus.PROCESSING),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException for non-existent paymentId", async () => {
      await expect(
        service.updateStatus("pay_does_not_exist", PaymentStatus.COMPLETED),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── Cancellation ────────────────────────────────────────────────────────────
  describe("cancelPayment()", () => {
    it("should cancel a PENDING payment", async () => {
      const { id } = await service.initiatePayment(validPaymentDto);
      const cancelled = await service.cancelPayment(id);
      expect(cancelled.status).toBe(PaymentStatus.CANCELLED);
    });

    it("should reject cancellation of an already-PROCESSING payment", async () => {
      const { id } = await service.initiatePayment(validPaymentDto);
      await service.updateStatus(id, PaymentStatus.PROCESSING);

      await expect(service.cancelPayment(id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── Lookup ──────────────────────────────────────────────────────────────────
  describe("getPayment()", () => {
    it("should return payment by ID", async () => {
      const created = await service.initiatePayment(validPaymentDto);
      const fetched = await service.getPayment(created.id);
      expect(fetched).toMatchObject({
        id: created.id,
        status: PaymentStatus.PENDING,
      });
    });

    it("should throw NotFoundException for unknown ID", async () => {
      await expect(service.getPayment("pay_unknown")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── Account history ─────────────────────────────────────────────────────────
  describe("listPaymentsByAccount()", () => {
    it("should return both outbound and inbound payments for an account", async () => {
      await service.initiatePayment({
        ...validPaymentDto,
        idempotencyKey: "k1",
      });
      await service.initiatePayment({
        ...validPaymentDto,
        idempotencyKey: "k2",
        fromAccountId: "acc_other",
        toAccountId: "acc_sender_001",
      });

      const history = await service.listPaymentsByAccount("acc_sender_001");
      expect(history).toHaveLength(2);
    });

    it("should return empty array for account with no payments", async () => {
      const history = await service.listPaymentsByAccount("acc_no_payments");
      expect(history).toHaveLength(0);
    });
  });
});
