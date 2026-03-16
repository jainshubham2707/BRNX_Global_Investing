import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "buyer",
  "issuer",
  "admin",
]);

export const kycStatusEnum = pgEnum("kyc_status", [
  "none",
  "pending",
  "approved",
  "rejected",
]);

export const txTypeEnum = pgEnum("tx_type", [
  "onramp",
  "transfer",
  "offramp",
  "purchase",
]);

export const txStatusEnum = pgEnum("tx_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

// ── Users ──────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  privyId: varchar("privy_id", { length: 255 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }),
  role: userRoleEnum("role").default("buyer").notNull(),
  walletAddress: varchar("wallet_address", { length: 42 }),
  kycStatus: kycStatusEnum("kyc_status").default("none").notNull(),
  kycDocumentUrl: text("kyc_document_url"),
  kycNotes: text("kyc_notes"),
  balanceUsdc: decimal("balance_usdc", { precision: 18, scale: 6 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Issuers ────────────────────────────────────────────────────────────

export const issuers = pgTable("issuers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  kybStatus: varchar("kyb_status", { length: 50 }).default("pending"),
  kybProvider: varchar("kyb_provider", { length: 50 }),
  walletAddress: varchar("wallet_address", { length: 42 }),
  balanceUsdc: decimal("balance_usdc", { precision: 18, scale: 6 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── RWA Tokens ─────────────────────────────────────────────────────────

export const tokens = pgTable("tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  priceUsd: decimal("price_usd", { precision: 18, scale: 2 }).default("2.50").notNull(),
  issuerId: uuid("issuer_id")
    .references(() => issuers.id)
    .notNull(),
  contractAddress: varchar("contract_address", { length: 42 }),
  tokenIdOnChain: integer("token_id_on_chain"),
  totalSupply: integer("total_supply").default(1000).notNull(),
  soldCount: integer("sold_count").default(0).notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Transactions ───────────────────────────────────────────────────────

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: txTypeEnum("type").notNull(),
  fromUserId: uuid("from_user_id").references(() => users.id),
  toUserId: uuid("to_user_id").references(() => users.id),
  amountUsdc: decimal("amount_usdc", { precision: 18, scale: 6 }),
  amountFiat: decimal("amount_fiat", { precision: 18, scale: 2 }),
  fiatCurrency: varchar("fiat_currency", { length: 10 }).default("AED"),
  status: txStatusEnum("status").default("pending").notNull(),
  txHash: varchar("tx_hash", { length: 66 }),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Instant Pay Requests ───────────────────────────────────────────────

export const instantPayStatusEnum = pgEnum("instant_pay_status", [
  "pending_transfer",
  "receipt_uploaded",
  "approved",
  "completed",
  "rejected",
]);

export const instantPayRequests = pgTable("instant_pay_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  tokenId: uuid("token_id")
    .references(() => tokens.id)
    .notNull(),
  quantity: integer("quantity").notNull(),
  amountUsd: decimal("amount_usd", { precision: 18, scale: 2 }).notNull(),
  amountAed: decimal("amount_aed", { precision: 18, scale: 2 }).notNull(),
  status: instantPayStatusEnum("status").default("pending_transfer").notNull(),
  bankReference: varchar("bank_reference", { length: 255 }),
  receiptUrl: text("receipt_url"),
  receiptFilename: text("receipt_filename"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Portfolio ──────────────────────────────────────────────────────────

export const portfolio = pgTable("portfolio", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  tokenId: uuid("token_id")
    .references(() => tokens.id)
    .notNull(),
  quantity: integer("quantity").default(0).notNull(),
  avgPurchasePrice: decimal("avg_purchase_price", { precision: 18, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── On-Chain Transactions ──────────────────────────────────────────────

export const onchainTxTypeEnum = pgEnum("onchain_tx_type", [
  "onramp_credit",
  "wallet_pay",
  "instant_pay_credit",
  "instant_pay_debit",
]);

export const onchainTransactions = pgTable("onchain_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: onchainTxTypeEnum("type").notNull(),
  fromAddress: varchar("from_address", { length: 42 }).notNull(),
  toAddress: varchar("to_address", { length: 42 }).notNull(),
  amountUsdc: decimal("amount_usdc", { precision: 18, scale: 6 }).notNull(),
  txHash: varchar("tx_hash", { length: 66 }).notNull(),
  chain: varchar("chain", { length: 50 }).default("base_sepolia").notNull(),
  relatedUserId: uuid("related_user_id").references(() => users.id),
  description: text("description"),
  aedAmount: decimal("aed_amount", { precision: 18, scale: 2 }),
  feeUsdc: decimal("fee_usdc", { precision: 18, scale: 6 }),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
