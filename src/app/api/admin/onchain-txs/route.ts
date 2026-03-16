import { NextResponse } from "next/server";
import { db } from "@/db";
import { onchainTransactions, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db
      .select({
        id: onchainTransactions.id,
        type: onchainTransactions.type,
        fromAddress: onchainTransactions.fromAddress,
        toAddress: onchainTransactions.toAddress,
        amountUsdc: onchainTransactions.amountUsdc,
        txHash: onchainTransactions.txHash,
        chain: onchainTransactions.chain,
        description: onchainTransactions.description,
        aedAmount: onchainTransactions.aedAmount,
        feeUsdc: onchainTransactions.feeUsdc,
        exchangeRate: onchainTransactions.exchangeRate,
        userEmail: users.email,
        createdAt: onchainTransactions.createdAt,
      })
      .from(onchainTransactions)
      .leftJoin(users, eq(onchainTransactions.relatedUserId, users.id))
      .orderBy(desc(onchainTransactions.createdAt))
      .limit(100);

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/admin/onchain-txs error:", error);
    return NextResponse.json([]);
  }
}
