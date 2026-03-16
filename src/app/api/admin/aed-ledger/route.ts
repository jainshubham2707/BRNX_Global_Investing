import { NextResponse } from "next/server";
import { db } from "@/db";
import { onchainTransactions, users } from "@/db/schema";
import { eq, desc, or } from "drizzle-orm";

export async function GET() {
  try {
    // All on-ramp transactions (AED received by admin)
    const aedEntries = await db
      .select({
        id: onchainTransactions.id,
        type: onchainTransactions.type,
        amountUsdc: onchainTransactions.amountUsdc,
        aedAmount: onchainTransactions.aedAmount,
        feeUsdc: onchainTransactions.feeUsdc,
        exchangeRate: onchainTransactions.exchangeRate,
        txHash: onchainTransactions.txHash,
        userEmail: users.email,
        description: onchainTransactions.description,
        createdAt: onchainTransactions.createdAt,
      })
      .from(onchainTransactions)
      .leftJoin(users, eq(onchainTransactions.relatedUserId, users.id))
      .where(
        or(
          eq(onchainTransactions.type, "onramp_credit"),
          eq(onchainTransactions.type, "instant_pay_credit"),
        )
      )
      .orderBy(desc(onchainTransactions.createdAt));

    const totalAedReceived = aedEntries.reduce(
      (sum, e) => sum + parseFloat(e.aedAmount || "0"), 0
    );
    const totalUsdcSent = aedEntries.reduce(
      (sum, e) => sum + parseFloat(e.amountUsdc || "0"), 0
    );
    const totalFeesAed = aedEntries.reduce(
      (sum, e) => sum + parseFloat(e.feeUsdc || "0") * parseFloat(e.exchangeRate || "3.6725"), 0
    );

    return NextResponse.json({
      totalAedReceived,
      totalUsdcSent,
      totalFeesAed,
      entries: aedEntries,
    });
  } catch (error) {
    console.error("GET /api/admin/aed-ledger error:", error);
    return NextResponse.json({ totalAedReceived: 0, totalUsdcSent: 0, totalFeesAed: 0, entries: [] });
  }
}
