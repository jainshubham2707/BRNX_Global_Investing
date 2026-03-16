import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, tokens, transactions, portfolio, instantPayRequests, onchainTransactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { transferUsdcFromAdmin, transferUsdcFromBuyerToIssuer, getAdminAddress, getIssuerAddress } from "@/lib/chain";

export async function POST(req: NextRequest) {
  try {
    const { requestId, action } = await req.json();

    const [request] = await db.select().from(instantPayRequests).where(eq(instantPayRequests.id, requestId)).limit(1);
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    if (action === "reject") {
      await db.update(instantPayRequests).set({ status: "rejected", updatedAt: new Date() }).where(eq(instantPayRequests.id, requestId));
      return NextResponse.json({ success: true, status: "rejected" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, request.userId)).limit(1);
    if (!user?.walletAddress) return NextResponse.json({ error: "User has no wallet" }, { status: 400 });

    const [token] = await db.select().from(tokens).where(eq(tokens.id, request.tokenId)).limit(1);
    if (!token) return NextResponse.json({ error: "Token not found" }, { status: 404 });

    const aedPaid = parseFloat(request.amountAed);
    const tokenCostUsd = parseFloat(token.priceUsd) * request.quantity;
    const adminAddress = getAdminAddress();
    const issuerAddress = getIssuerAddress();

    // Fee calculation: buyer paid totalAed which includes 15bps fee on top
    // totalAed = tokenCostUsd × rate × (1 + 15/10000)
    // The fee is Borderless's revenue — buyer gets the FULL token cost in USDC
    const rate = parseFloat(process.env.NEXT_PUBLIC_USD_AED_RATE || "3.6725");
    const feeBps = parseInt(process.env.TRANSACTION_FEE_BPS || "15");
    const baseAed = tokenCostUsd * rate;
    const feeAed = aedPaid - baseAed; // fee portion of what buyer paid

    // ── TX 1: Platform wallet → User wallet (credit full token cost) ──
    const { txHash: creditTxHash } = await transferUsdcFromAdmin(user.walletAddress, tokenCostUsd);

    await db.insert(onchainTransactions).values({
      type: "instant_pay_credit",
      fromAddress: adminAddress,
      toAddress: user.walletAddress,
      amountUsdc: String(tokenCostUsd),
      txHash: creditTxHash,
      relatedUserId: user.id,
      description: `Instant pay on-ramp: ${aedPaid.toFixed(2)} AED → ${tokenCostUsd.toFixed(2)} USDC to user (fee: ${feeAed.toFixed(4)} AED / ${feeBps}bps)`,
      aedAmount: String(aedPaid),
      feeUsdc: String(feeAed / rate),
      exchangeRate: String(rate),
    });

    // ── TX 2: Buyer wallet → Issuer wallet (token payment) ─────────────
    const { txHash: debitTxHash } = await transferUsdcFromBuyerToIssuer(user.walletAddress, tokenCostUsd);

    await db.insert(onchainTransactions).values({
      type: "instant_pay_debit",
      fromAddress: user.walletAddress,
      toAddress: issuerAddress,
      amountUsdc: String(tokenCostUsd),
      txHash: debitTxHash,
      relatedUserId: user.id,
      description: `Instant pay purchase: ${request.quantity}x ${token.name} = ${tokenCostUsd} USDC (buyer → issuer)`,
    });

    // Record transactions
    await db.insert(transactions).values({
      type: "onramp", toUserId: user.id, amountUsdc: String(tokenCostUsd),
      amountFiat: String(aedPaid), fiatCurrency: "AED", status: "completed", txHash: creditTxHash,
    });
    await db.insert(transactions).values({
      type: "transfer", fromUserId: user.id, amountUsdc: String(tokenCostUsd),
      status: "completed", txHash: debitTxHash,
      metadata: JSON.stringify({ to: "issuer", tokenId: request.tokenId }),
    });
    await db.insert(transactions).values({
      type: "purchase", fromUserId: user.id, amountUsdc: String(tokenCostUsd),
      status: "completed", txHash: debitTxHash,
      metadata: JSON.stringify({ tokenId: request.tokenId, quantity: request.quantity, mode: "instant" }),
    });

    // ── Mint tokens to buyer portfolio ─────────────────────────────────
    const [existing] = await db.select().from(portfolio)
      .where(and(eq(portfolio.userId, user.id), eq(portfolio.tokenId, request.tokenId))).limit(1);

    if (existing) {
      await db.update(portfolio).set({
        quantity: (existing.quantity || 0) + request.quantity, updatedAt: new Date(),
      }).where(eq(portfolio.id, existing.id));
    } else {
      await db.insert(portfolio).values({
        userId: user.id, tokenId: request.tokenId,
        quantity: request.quantity, avgPurchasePrice: token.priceUsd,
      });
    }

    await db.update(tokens).set({
      soldCount: sql`${tokens.soldCount} + ${request.quantity}`,
    }).where(eq(tokens.id, request.tokenId));

    await db.update(instantPayRequests).set({ status: "completed", updatedAt: new Date() }).where(eq(instantPayRequests.id, requestId));

    return NextResponse.json({ success: true, creditTxHash, debitTxHash, usdcCredited: tokenCostUsd });
  } catch (error) {
    console.error("POST /api/admin/approve-instant-pay error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
