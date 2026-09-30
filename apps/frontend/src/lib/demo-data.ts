/**
 * Demo data — served when the app runs in demo mode (no backend required).
 * Activated via the "View Live Demo" button on the login page.
 */

import {
  AuthUserResponse,
  UserRole,
  UserStatus,
  ICustomer,
  IAccount,
  ITransaction,
  AccountType,
  AccountStatus,
  KycStatus,
  TransactionType,
  TransactionStatus,
} from "@banking/shared-types";

export const DEMO_TOKEN = "__demo__";

/* ─────────────────────────────────────────────
   USER
───────────────────────────────────────────── */
export const DEMO_USER: AuthUserResponse = {
  id: "demo-user-001",
  email: "arjun.mehta@novabank.demo",
  role: UserRole.CUSTOMER,
  status: UserStatus.ACTIVE,
  emailVerified: true,
};

/* ─────────────────────────────────────────────
   CUSTOMER PROFILE
───────────────────────────────────────────── */
export const DEMO_CUSTOMER: ICustomer = {
  id: "demo-customer-001",
  userId: "demo-user-001",
  firstName: "Arjun",
  lastName: "Mehta",
  email: "arjun.mehta@novabank.demo",
  phone: "+91 98765 43210",
  dateOfBirth: "1992-07-14T00:00:00Z",
  address: {
    street: "42 Marina Promenade",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400001",
    country: "India",
  },
  kycStatus: KycStatus.VERIFIED,
  riskScore: 12,
  createdAt: new Date("2024-01-15T08:30:00Z"),
  updatedAt: new Date("2026-08-01T10:00:00Z"),
};

/* ─────────────────────────────────────────────
   ACCOUNTS  (3 accounts)
───────────────────────────────────────────── */
export const DEMO_ACCOUNTS: IAccount[] = [
  {
    id: "demo-acc-savings",
    accountNumber: "NB10001234567890",
    userId: "demo-user-001",
    type: AccountType.SAVINGS,
    currency: "INR",
    balanceMinor: 158245600, // ₹15,82,456.00
    availableBalanceMinor: 158245600,
    status: AccountStatus.ACTIVE,
    createdAt: new Date("2024-01-15T08:30:00Z"),
    updatedAt: new Date("2026-09-04T18:22:00Z"),
  },
  {
    id: "demo-acc-current",
    accountNumber: "NB10009876543210",
    userId: "demo-user-001",
    type: AccountType.CURRENT,
    currency: "INR",
    balanceMinor: 43781250, // ₹4,37,812.50
    availableBalanceMinor: 43781250,
    status: AccountStatus.ACTIVE,
    createdAt: new Date("2024-03-10T10:00:00Z"),
    updatedAt: new Date("2026-09-05T09:10:00Z"),
  },
  {
    id: "demo-acc-salary",
    accountNumber: "NB10005555444433",
    userId: "demo-user-001",
    type: AccountType.SALARY,
    currency: "INR",
    balanceMinor: 21000000, // ₹2,10,000.00
    availableBalanceMinor: 21000000,
    status: AccountStatus.ACTIVE,
    createdAt: new Date("2024-06-01T00:00:00Z"),
    updatedAt: new Date("2026-09-01T08:00:00Z"),
  },
];

/* ─────────────────────────────────────────────
   TRANSACTIONS  (20 realistic entries)
───────────────────────────────────────────── */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(8 + (n % 12), (n * 3) % 60, 0, 0);
  return d;
}

export const DEMO_TRANSACTIONS: ITransaction[] = [
  {
    id: "t01",
    transactionId: "TXNT0100001",
    userId: "demo-user-001",
    accountId: "demo-acc-salary",
    type: TransactionType.DEPOSIT,
    amountMinor: 21000000,
    currency: "INR",
    description: "Salary Credit — September 2026",
    status: TransactionStatus.COMPLETED,
    idempotencyKey: "ik-t01",
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },
  {
    id: "t02",
    transactionId: "TXNT0200002",
    userId: "demo-user-001",
    accountId: "demo-acc-salary",
    destinationAccountId: "demo-acc-savings",
    type: TransactionType.TRANSFER,
    amountMinor: 4500000,
    currency: "INR",
    description: "Transfer to Savings for SIP",
    status: TransactionStatus.COMPLETED,
    idempotencyKey: "ik-t02",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "t03",
    transactionId: "TXNT0300003",
    userId: "demo-user-001",
    accountId: "demo-acc-savings",
    type: TransactionType.WITHDRAWAL,
    amountMinor: 1250000,
    currency: "INR",
    description: "ATM Cash Withdrawal — Bandra West",
    status: TransactionStatus.COMPLETED,
    idempotencyKey: "ik-t03",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "t04",
    transactionId: "TXNT0400004",
    userId: "demo-user-001",
    accountId: "demo-acc-savings",
    type: TransactionType.DEPOSIT,
    amountMinor: 15000000,
    currency: "INR",
    description: "FD Maturity Credit",
    status: TransactionStatus.COMPLETED,
    idempotencyKey: "ik-t04",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "t05",
    transactionId: "TXNT0500005",
    userId: "demo-user-001",
    accountId: "demo-acc-current",
    type: TransactionType.TRANSFER,
    amountMinor: 2500000,
    currency: "INR",
    description: "Rent — Prestige Towers Oct",
    status: TransactionStatus.COMPLETED,
    idempotencyKey: "ik-t05",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "t06",
    transactionId: "TXNT0600006",
    userId: "demo-user-001",
    accountId: "demo-acc-current",
    type: TransactionType.WITHDRAWAL,
    amountMinor: 320000,
    currency: "INR",
    description: "Swiggy Order — Weekend Dinner",
    status: TransactionStatus.COMPLETED,
    idempotencyKey: "ik-t06",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "t07",
    transactionId: "TXNT0700007",
    userId: "demo-user-001",
    accountId: "demo-acc-current",
    type: TransactionType.DEPOSIT,
    amountMinor: 800000,
    currency: "INR",
    description: "Freelance Invoice #INV-2098",
    status: TransactionStatus.COMPLETED,
    idempotencyKey: "ik-t07",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },
  {
    id: "t08",
    transactionId: "TXNT0800008",
    userId: "demo-user-001",
    accountId: "demo-acc-savings",
    type: TransactionType.TRANSFER,
    amountMinor: 6000000,
    currency: "INR",
    description: "Insurance Premium — LIC Annual",
    status: TransactionStatus.COMPLETED,
    idempotencyKey: "ik-t08",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: "t09",
    transactionId: "TXNT0900009",
    userId: "demo-user-001",
    accountId: "demo-acc-current",
    type: TransactionType.WITHDRAWAL,
    amountMinor: 549900,
    currency: "INR",
    description: "Netflix + Spotify + YouTube Premium",
    status: TransactionStatus.COMPLETED,
    idempotencyKey: "ik-t09",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(6),
  },
  {
    id: "t10",
    transactionId: "TXNT1000010",
    userId: "demo-user-001",
    accountId: "demo-acc-current",
    type: TransactionType.DEPOSIT,
    amountMinor: 1500000,
    currency: "INR",
    description: "Client Advance Payment",
    status: TransactionStatus.COMPLETED,
    idempotencyKey: "ik-t10",
    createdAt: daysAgo(7),
    updatedAt: daysAgo(7),
  },
  {
    id: "t11",
    transactionId: "TXNT1100011",
    userId: "demo-user-001",
    accountId: "demo-acc-savings",
    destinationAccountId: "demo-acc-current",
    type: TransactionType.TRANSFER,
    amountMinor: 3000000,
    currency: "INR",
    description: "Transfer to Current — Business Expenses",
    status: TransactionStatus.COMPLETED,
    idempotencyKey: "ik-t11",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(8),
  },
  {
    id: "t12",
    transactionId: "TXNT1200012",
    userId: "demo-user-001",
    accountId: "demo-acc-savings",
    type: TransactionType.WITHDRAWAL,
    amountMinor: 1820000,
    currency: "INR",
    description: "Amazon.in — MacBook Pro Accessories",
    status: TransactionStatus.COMPLETED,
    idempotencyKey: "ik-t12",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(9),
  },
  {
    id: "t13",
    transactionId: "TXNT1300013",
    userId: "demo-user-001",
    accountId: "demo-acc-savings",
    type: TransactionType.DEPOSIT,
    amountMinor: 5000000,
    currency: "INR",
    description: "Stock Dividend — HDFC Bank Quarterly",
    status: TransactionStatus.COMPLETED,
    idempotencyKey: "ik-t13",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },
  {
    id: "t14",
    transactionId: "TXNT1400014",
    userId: "demo-user-001",
    accountId: "demo-acc-current",
    type: TransactionType.WITHDRAWAL,
    amountMinor: 675000,
    currency: "INR",
    description: "Zomato + Blinkit Weekly Groceries",
    status: TransactionStatus.COMPLETED,
    idempotencyKey: "ik-t14",
    createdAt: daysAgo(11),
    updatedAt: daysAgo(11),
  },
  {
    id: "t15",
    transactionId: "TXNT1500015",
    userId: "demo-user-001",
    accountId: "demo-acc-savings",
    type: TransactionType.TRANSFER,
    amountMinor: 10000000,
    currency: "INR",
    description: "Investment — Nifty50 Index Fund SIP",
    status: TransactionStatus.COMPLETED,
    idempotencyKey: "ik-t15",
    createdAt: daysAgo(12),
    updatedAt: daysAgo(12),
  },
  {
    id: "t16",
    transactionId: "TXNT1600016",
    userId: "demo-user-001",
    accountId: "demo-acc-savings",
    type: TransactionType.DEPOSIT,
    amountMinor: 2200000,
    currency: "INR",
    description: "Rental Income — Apartment 4B Dadar",
    status: TransactionStatus.COMPLETED,
    idempotencyKey: "ik-t16",
    createdAt: daysAgo(14),
    updatedAt: daysAgo(14),
  },
  {
    id: "t17",
    transactionId: "TXNT1700017",
    userId: "demo-user-001",
    accountId: "demo-acc-current",
    type: TransactionType.WITHDRAWAL,
    amountMinor: 999900,
    currency: "INR",
    description: "Flipkart Big Billion Sale — Appliances",
    status: TransactionStatus.COMPLETED,
    idempotencyKey: "ik-t17",
    createdAt: daysAgo(15),
    updatedAt: daysAgo(15),
  },
  {
    id: "t18",
    transactionId: "TXNT1800018",
    userId: "demo-user-001",
    accountId: "demo-acc-salary",
    type: TransactionType.TRANSFER,
    amountMinor: 1000000,
    currency: "INR",
    description: "Family Transfer — Parents Monthly",
    status: TransactionStatus.COMPLETED,
    idempotencyKey: "ik-t18",
    createdAt: daysAgo(17),
    updatedAt: daysAgo(17),
  },
  {
    id: "t19",
    transactionId: "TXNT1900019",
    userId: "demo-user-001",
    accountId: "demo-acc-salary",
    type: TransactionType.DEPOSIT,
    amountMinor: 7500000,
    currency: "INR",
    description: "Performance Bonus — Q2 Appraisal",
    status: TransactionStatus.COMPLETED,
    idempotencyKey: "ik-t19",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(20),
  },
  {
    id: "t20",
    transactionId: "TXNT2000020",
    userId: "demo-user-001",
    accountId: "demo-acc-current",
    type: TransactionType.WITHDRAWAL,
    amountMinor: 420000,
    currency: "INR",
    description: "Fuel + Toll — Mumbai-Pune Expressway",
    status: TransactionStatus.PENDING,
    idempotencyKey: "ik-t20",
    createdAt: daysAgo(22),
    updatedAt: daysAgo(22),
  },
];

/* ─────────────────────────────────────────────
   DEMO STATE STORAGE & INTERCEPTOR
───────────────────────────────────────────── */
export function getDemoAccounts(): IAccount[] {
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem("demo_accounts");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // fallback
      }
    }
  }
  return [...DEMO_ACCOUNTS];
}

export function saveDemoAccounts(accounts: IAccount[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem("demo_accounts", JSON.stringify(accounts));
  }
}

export function getDemoTransactions(): ITransaction[] {
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem("demo_transactions");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // fallback
      }
    }
  }
  return [...DEMO_TRANSACTIONS];
}

export function saveDemoTransactions(txs: ITransaction[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem("demo_transactions", JSON.stringify(txs));
  }
}

export function getDemoCustomer(): ICustomer {
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem("demo_customer");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // fallback
      }
    }
  }
  return { ...DEMO_CUSTOMER };
}

export function saveDemoCustomer(customer: ICustomer) {
  if (typeof window !== "undefined") {
    localStorage.setItem("demo_customer", JSON.stringify(customer));
  }
}

export function resetDemoData() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("demo_accounts");
    localStorage.removeItem("demo_transactions");
    localStorage.removeItem("demo_customer");
  }
}

export function handleDemoApi(path: string, options: RequestInit = {}): any {
  const method = (options.method || "GET").toUpperCase();

  if (path.includes("/api/v1/auth/me")) {
    return DEMO_USER;
  }

  if (path.includes("/api/v1/customers/me")) {
    return getDemoCustomer();
  }

  if (path.includes("/api/v1/customers/") && method === "PATCH") {
    const body = options.body ? JSON.parse(options.body as string) : {};
    const curr = getDemoCustomer();
    const updated: ICustomer = {
      ...curr,
      ...body,
      address: { ...curr.address, ...(body.address || {}) },
      updatedAt: new Date(),
    };
    saveDemoCustomer(updated);
    return updated;
  }

  if (path.includes("/api/v1/accounts")) {
    if (method === "GET") {
      return { accounts: getDemoAccounts() };
    }
    if (method === "POST") {
      const body = options.body ? JSON.parse(options.body as string) : {};
      const currentAccounts = getDemoAccounts();
      const newAccount: IAccount = {
        id: "demo-acc-" + Date.now().toString(36),
        accountNumber:
          "NB1000" + Math.floor(1000000000 + Math.random() * 9000000000),
        userId: DEMO_USER.id,
        type: body.type || AccountType.SAVINGS,
        currency: body.currency || "INR",
        balanceMinor: 0,
        availableBalanceMinor: 0,
        status: AccountStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      currentAccounts.push(newAccount);
      saveDemoAccounts(currentAccounts);
      return newAccount;
    }
  }

  if (path.includes("/api/v1/transactions/deposit") && method === "POST") {
    const body = options.body ? JSON.parse(options.body as string) : {};
    const accounts = getDemoAccounts();
    const targetAcc =
      accounts.find(
        (a) => a.id === body.accountId || a.accountNumber === body.accountId,
      ) || accounts[0];

    if (targetAcc) {
      targetAcc.balanceMinor += body.amountMinor || 0;
      targetAcc.availableBalanceMinor += body.amountMinor || 0;
      saveDemoAccounts(accounts);
    }

    const txs = getDemoTransactions();
    const newTx: ITransaction = {
      id: "t-dep-" + Date.now(),
      transactionId: "TXNDEP" + Math.floor(100000 + Math.random() * 900000),
      userId: DEMO_USER.id,
      accountId: targetAcc ? targetAcc.id : "demo-acc-savings",
      type: TransactionType.DEPOSIT,
      amountMinor: body.amountMinor || 0,
      currency: "INR",
      description: body.description || "Cash / Online Deposit",
      status: TransactionStatus.COMPLETED,
      idempotencyKey: "demo-ik-" + Date.now(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    txs.unshift(newTx);
    saveDemoTransactions(txs);
    return newTx;
  }

  if (path.includes("/api/v1/transactions/withdraw") && method === "POST") {
    const body = options.body ? JSON.parse(options.body as string) : {};
    const accounts = getDemoAccounts();
    const targetAcc =
      accounts.find(
        (a) => a.id === body.accountId || a.accountNumber === body.accountId,
      ) || accounts[0];

    if (targetAcc) {
      targetAcc.balanceMinor = Math.max(
        0,
        targetAcc.balanceMinor - (body.amountMinor || 0),
      );
      targetAcc.availableBalanceMinor = Math.max(
        0,
        targetAcc.availableBalanceMinor - (body.amountMinor || 0),
      );
      saveDemoAccounts(accounts);
    }

    const txs = getDemoTransactions();
    const newTx: ITransaction = {
      id: "t-wth-" + Date.now(),
      transactionId: "TXNWTH" + Math.floor(100000 + Math.random() * 900000),
      userId: DEMO_USER.id,
      accountId: targetAcc ? targetAcc.id : "demo-acc-savings",
      type: TransactionType.WITHDRAWAL,
      amountMinor: body.amountMinor || 0,
      currency: "INR",
      description: body.description || "ATM / Branch Withdrawal",
      status: TransactionStatus.COMPLETED,
      idempotencyKey: "demo-ik-" + Date.now(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    txs.unshift(newTx);
    saveDemoTransactions(txs);
    return newTx;
  }

  if (path.includes("/api/v1/transactions/transfer") && method === "POST") {
    const body = options.body ? JSON.parse(options.body as string) : {};
    const accounts = getDemoAccounts();
    const src =
      accounts.find(
        (a) =>
          a.id === body.sourceAccountId ||
          a.accountNumber === body.sourceAccountId,
      ) || accounts[0];
    const dst = accounts.find(
      (a) =>
        a.id === body.destinationAccountId ||
        a.accountNumber === body.destinationAccountId,
    );

    if (src) {
      src.balanceMinor = Math.max(
        0,
        src.balanceMinor - (body.amountMinor || 0),
      );
      src.availableBalanceMinor = Math.max(
        0,
        src.availableBalanceMinor - (body.amountMinor || 0),
      );
    }
    if (dst) {
      dst.balanceMinor += body.amountMinor || 0;
      dst.availableBalanceMinor += body.amountMinor || 0;
    }
    saveDemoAccounts(accounts);

    const txs = getDemoTransactions();
    const newTx: ITransaction = {
      id: "t-trf-" + Date.now(),
      transactionId: "TXNTRF" + Math.floor(100000 + Math.random() * 900000),
      userId: DEMO_USER.id,
      accountId: src ? src.id : "demo-acc-savings",
      destinationAccountId: dst ? dst.id : body.destinationAccountId,
      type: TransactionType.TRANSFER,
      amountMinor: body.amountMinor || 0,
      currency: "INR",
      description:
        body.description || `Transfer to ${body.destinationAccountId}`,
      status: TransactionStatus.COMPLETED,
      idempotencyKey: "demo-ik-" + Date.now(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    txs.unshift(newTx);
    saveDemoTransactions(txs);
    return newTx;
  }

  if (path.includes("/api/v1/transactions")) {
    return { data: getDemoTransactions() };
  }

  if (path.includes("/api/v1/auth/logout")) {
    resetDemoData();
    return { success: true };
  }

  return undefined;
}
