import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, transactions, onchainTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPrivyUser } from "@/lib/auth";
import { transferUsdcFromAdmin, aedToUsdcConversion, getAdminAddress } from "@/lib/chain";

/**
 * Auto on-ramp: buyer triggers this after "I've sent the money".
 * Simulates the admin verifying the bank transfer and crediting USDC.
 * Flow of funds is identical to /api/admin/credit-balance.
 */
export async function POST(req: NextRequest) {
  try {
    const privyUser = await getPrivyUser(req);
    if (!privyUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { aedAmount } = await req.json();
    const aed = parseFloat(aedAmount);

    if (isNaN(aed) || aed <= 0) {
      return NextResponse.json({ error: "Invalid AED amount" }, { status: 400 });
    }

    const [user] = await db.select().from(users).where(eq(users.privyId, privyUser.id)).limit(1);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!user.walletAddress) return NextResponse.json({ error: "User has no wallet" }, { status: 400 });

    // AED paid by user → net USD/USDC after 15bps fee
    const conv = aedToUsdcConversion(aed);

    // Send USDC on-chain: platform wallet → user wallet
    const { txHash } = await transferUsdcFromAdmin(user.walletAddress, conv.netUsd);

    // Update DB balance
    const newBalance = parseFloat(user.balanceUsdc || "0") + conv.netUsd;
    await db.update(users).set({
      balanceUsdc: String(newBalance),
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));

    // Record on-chain tx
    await db.insert(onchainTransactions).values({
      type: "onramp_credit",
      fromAddress: getAdminAddress(),
      toAddress: user.walletAddress,
      amountUsdc: String(conv.netUsd),
      txHash,
      relatedUserId: user.id,
      description: `On-ramp: ${aed.toFixed(2)} AED → ${conv.netUsd.toFixed(6)} USDC (fee: ${conv.feeAed.toFixed(4)} AED / ${conv.feeBps}bps)`,
      aedAmount: String(aed),
      feeUsdc: String(conv.feeAed / conv.rate),
      exchangeRate: String(conv.rate),
    });

    await db.insert(transactions).values({
      type: "onramp",
      toUserId: user.id,
      amountUsdc: String(conv.netUsd),
      amountFiat: String(aed),
      fiatCurrency: "AED",
      status: "completed",
      txHash,
    });

    return NextResponse.json({
      success: true,
      txHash,
      aedPaid: aed,
      feeAed: conv.feeAed,
      usdCredited: conv.netUsd,
      newBalance,
    });
  } catch (error) {
    console.error("POST /api/auto-onramp error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
