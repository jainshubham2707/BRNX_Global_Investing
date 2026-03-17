CREATE TYPE "public"."instant_pay_status" AS ENUM('pending_transfer', 'receipt_uploaded', 'approved', 'completed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('none', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."onchain_tx_type" AS ENUM('onramp_credit', 'wallet_pay', 'instant_pay_credit', 'instant_pay_debit', 'offramp');--> statement-breakpoint
CREATE TYPE "public"."tx_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."tx_type" AS ENUM('onramp', 'transfer', 'offramp', 'purchase');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('buyer', 'issuer', 'admin');--> statement-breakpoint
CREATE TABLE "instant_pay_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"amount_usd" numeric(18, 2) NOT NULL,
	"amount_aed" numeric(18, 2) NOT NULL,
	"status" "instant_pay_status" DEFAULT 'pending_transfer' NOT NULL,
	"bank_reference" varchar(255),
	"receipt_url" text,
	"receipt_filename" text,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issuers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"kyb_status" varchar(50) DEFAULT 'pending',
	"kyb_provider" varchar(50),
	"wallet_address" varchar(42),
	"balance_usdc" numeric(18, 6) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onchain_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "onchain_tx_type" NOT NULL,
	"from_address" varchar(42) NOT NULL,
	"to_address" varchar(42) NOT NULL,
	"amount_usdc" numeric(18, 6) NOT NULL,
	"tx_hash" varchar(66) NOT NULL,
	"chain" varchar(50) DEFAULT 'base_sepolia' NOT NULL,
	"related_user_id" uuid,
	"description" text,
	"aed_amount" numeric(18, 2),
	"fee_usdc" numeric(18, 6),
	"exchange_rate" numeric(10, 6),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_id" uuid NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"avg_purchase_price" numeric(18, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price_usd" numeric(18, 2) DEFAULT '2.50' NOT NULL,
	"issuer_id" uuid NOT NULL,
	"contract_address" varchar(42),
	"token_id_on_chain" integer,
	"total_supply" integer DEFAULT 1000 NOT NULL,
	"sold_count" integer DEFAULT 0 NOT NULL,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "tx_type" NOT NULL,
	"from_user_id" uuid,
	"to_user_id" uuid,
	"amount_usdc" numeric(18, 6),
	"amount_fiat" numeric(18, 2),
	"fiat_currency" varchar(10) DEFAULT 'AED',
	"status" "tx_status" DEFAULT 'pending' NOT NULL,
	"tx_hash" varchar(66),
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"privy_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"role" "user_role" DEFAULT 'buyer' NOT NULL,
	"wallet_address" varchar(42),
	"kyc_status" "kyc_status" DEFAULT 'none' NOT NULL,
	"kyc_document_url" text,
	"kyc_notes" text,
	"balance_usdc" numeric(18, 6) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_privy_id_unique" UNIQUE("privy_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "instant_pay_requests" ADD CONSTRAINT "instant_pay_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instant_pay_requests" ADD CONSTRAINT "instant_pay_requests_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuers" ADD CONSTRAINT "issuers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onchain_transactions" ADD CONSTRAINT "onchain_transactions_related_user_id_users_id_fk" FOREIGN KEY ("related_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio" ADD CONSTRAINT "portfolio_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio" ADD CONSTRAINT "portfolio_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_issuer_id_issuers_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."issuers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;