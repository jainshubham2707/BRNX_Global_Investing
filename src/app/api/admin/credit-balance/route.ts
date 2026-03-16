import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, transactions, onchainTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { transferUsdcFromAdmin, aedToUsdcConversion, getAdminAddress } from "@/lib/chain";

export async function POST(req: NextRequest) {
  try {
    const { email, aedAmount } = await req.json();
    const aed = parseFloat(aedAmount);

    if (!email || isNaN(aed) || aed <= 0) {
      return NextResponse.json({ error: "Invalid email or AED amount" }, { status: 400 });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
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
      feeUsdc: String(conv.feeAed / conv.rate), // fee in USD terms
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
      rate: conv.rate,
      newBalance,
    });
  } catch (error) {
    console.error("POST /api/admin/credit-balance error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
