import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, tokens, transactions, portfolio, onchainTransactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getPrivyUser } from "@/lib/auth";
import { transferUsdcFromBuyerToIssuer, getIssuerAddress } from "@/lib/chain";

export async function POST(req: NextRequest) {
  try {
    const privyUser = await getPrivyUser(req);
    if (!privyUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { tokenId, quantity } = await req.json();

    const [user] = await db.select().from(users).where(eq(users.privyId, privyUser.id)).limit(1);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [token] = await db.select().from(tokens).where(eq(tokens.id, tokenId)).limit(1);
    if (!token) return NextResponse.json({ error: "Token not found" }, { status: 404 });

    const totalCost = parseFloat(token.priceUsd) * quantity;
    const userBalance = parseFloat(user.balanceUsdc || "0");

    if (userBalance < totalCost) {
      return NextResponse.json({ error: "Insufficient USD balance" }, { status: 400 });
    }

    const issuerAddress = getIssuerAddress();

    if (!user.walletAddress) {
      return NextResponse.json({ error: "User has no wallet" }, { status: 400 });
    }

    // Send USDC from buyer's Privy wallet → issuer (Atlas Capital) on-chain
    const { txHash } = await transferUsdcFromBuyerToIssuer(user.walletAddress, totalCost);

    // Deduct from user's DB balance
    await db.update(users).set({
      balanceUsdc: String(userBalance - totalCost),
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));

    // Record on-chain tx: buyer → issuer
    await db.insert(onchainTransactions).values({
      type: "wallet_pay",
      fromAddress: user.walletAddress,
      toAddress: issuerAddress,
      amountUsdc: String(totalCost),
      txHash,
      relatedUserId: user.id,
      description: `Wallet pay: ${quantity}x ${token.name} = ${totalCost} USDC (buyer → issuer)`,
    });

    await db.insert(transactions).values({
      type: "purchase",
      fromUserId: user.id,
      amountUsdc: String(totalCost),
      status: "completed",
      txHash,
      metadata: JSON.stringify({ tokenId, quantity, mode: "wallet", to: "issuer" }),
    });

    // Update portfolio
    const [existing] = await db.select().from(portfolio)
      .where(and(eq(portfolio.userId, user.id), eq(portfolio.tokenId, tokenId))).limit(1);

    if (existing) {
      await db.update(portfolio).set({
        quantity: (existing.quantity || 0) + quantity, updatedAt: new Date(),
      }).where(eq(portfolio.id, existing.id));
    } else {
      await db.insert(portfolio).values({
        userId: user.id, tokenId, quantity, avgPurchasePrice: token.priceUsd,
      });
    }

    await db.update(tokens).set({
      soldCount: sql`${tokens.soldCount} + ${quantity}`,
    }).where(eq(tokens.id, tokenId));

    return NextResponse.json({ success: true, txHash });
  } catch (error) {
    console.error("POST /api/purchase error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
