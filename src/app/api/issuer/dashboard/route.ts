import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  tokens,
  issuers,
  onchainTransactions,
  transactions,
  portfolio,
  users,
} from "@/db/schema";
import { eq, desc, sql, or, and } from "drizzle-orm";
import { getUsdcBalance, getIssuerAddress } from "@/lib/chain";
import { getPrivyUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Verify the authenticated user is an issuer
    const privyUser = await getPrivyUser(req);
    if (!privyUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [authUser] = await db.select().from(users).where(eq(users.privyId, privyUser.id)).limit(1);
    if (!authUser || authUser.role !== "issuer") {
      return NextResponse.json({ error: "Issuer access only" }, { status: 403 });
    }
    const issuerAddress = getIssuerAddress();

    // Get issuer info
    const [issuer] = await db.select().from(issuers).limit(1);

    // Get all tokens
    const allTokens = await db
      .select()
      .from(tokens)
      .where(eq(tokens.issuerId, issuer.id));

    // Total tokens sold & revenue
    const totalSold = allTokens.reduce(
      (sum, t) => sum + (t.soldCount || 0),
      0
    );
    const totalRevenue = allTokens.reduce(
      (sum, t) => sum + (t.soldCount || 0) * parseFloat(t.priceUsd),
      0
    );
    const totalSupply = allTokens.reduce(
      (sum, t) => sum + (t.totalSupply || 0),
      0
    );

    // On-chain USDC balance
    const onChainUsdc = await getUsdcBalance(issuerAddress);

    // Get on-chain transactions TO issuer
    const incomingTxs = await db
      .select()
      .from(onchainTransactions)
      .where(
        or(
          eq(onchainTransactions.toAddress, issuerAddress),
          eq(onchainTransactions.type, "wallet_pay"),
          eq(onchainTransactions.type, "instant_pay_debit")
        )
      )
      .orderBy(desc(onchainTransactions.createdAt))
      .limit(100);

    // Filter to only txs going to issuer
    const issuerTxs = incomingTxs.filter(
      (tx) => tx.toAddress.toLowerCase() === issuerAddress.toLowerCase()
    );

    // Total USDC received
    const totalUsdcReceived = issuerTxs.reduce(
      (sum, tx) => sum + parseFloat(tx.amountUsdc || "0"),
      0
    );

    // ── Per-token analytics ──────────────────────────────────────────
    const tokenIds = allTokens.map((t) => t.id);

    // Get all portfolio entries for our tokens (investors)
    const allHoldings =
      tokenIds.length > 0
        ? await db
            .select({
              tokenId: portfolio.tokenId,
              userId: portfolio.userId,
              quantity: portfolio.quantity,
              avgPrice: portfolio.avgPurchasePrice,
              email: users.email,
              name: users.name,
            })
            .from(portfolio)
            .leftJoin(users, eq(portfolio.userId, users.id))
            .where(
              sql`${portfolio.tokenId} IN (${sql.join(
                tokenIds.map((id) => sql`${id}`),
                sql`, `
              )})`
            )
        : [];

    // Unique investors
    const uniqueInvestorIds = new Set(allHoldings.map((h) => h.userId));
    const totalInvestors = uniqueInvestorIds.size;

    // Per-token breakdown
    const tokenAnalytics = allTokens.map((token) => {
      const holders = allHoldings.filter((h) => h.tokenId === token.id);
      const tokenRevenue =
        (token.soldCount || 0) * parseFloat(token.priceUsd);
      const uniqueBuyers = new Set(holders.map((h) => h.userId)).size;
      const totalHeld = holders.reduce((s, h) => s + (h.quantity || 0), 0);
      return {
        id: token.id,
        name: token.name,
        description: token.description,
        priceUsd: token.priceUsd,
        totalSupply: token.totalSupply,
        soldCount: token.soldCount || 0,
        remaining: token.totalSupply - (token.soldCount || 0),
        percentSold:
          token.totalSupply > 0
            ? ((token.soldCount || 0) / token.totalSupply) * 100
            : 0,
        revenue: tokenRevenue,
        uniqueBuyers,
        totalHeld,
        avgOrderSize:
          uniqueBuyers > 0
            ? (token.soldCount || 0) / uniqueBuyers
            : 0,
      };
    });

    // ── Investor list ────────────────────────────────────────────────
    const investorMap = new Map<
      string,
      {
        userId: string;
        email: string;
        name: string | null;
        holdings: Array<{ tokenName: string; quantity: number; value: number }>;
        totalValue: number;
      }
    >();

    for (const h of allHoldings) {
      const tokenInfo = allTokens.find((t) => t.id === h.tokenId);
      if (!tokenInfo) continue;
      const existing = investorMap.get(h.userId);
      const holdingValue =
        (h.quantity || 0) * parseFloat(tokenInfo.priceUsd);
      const holding = {
        tokenName: tokenInfo.name,
        quantity: h.quantity || 0,
        value: holdingValue,
      };

      if (existing) {
        existing.holdings.push(holding);
        existing.totalValue += holdingValue;
      } else {
        investorMap.set(h.userId, {
          userId: h.userId,
          email: h.email || "unknown",
          name: h.name,
          holdings: [holding],
          totalValue: holdingValue,
        });
      }
    }

    const investors = Array.from(investorMap.values()).sort(
      (a, b) => b.totalValue - a.totalValue
    );

    // ── Purchase transactions (from transactions table) ──────────────
    const purchaseTxs = await db
      .select({
        id: transactions.id,
        amountUsdc: transactions.amountUsdc,
        txHash: transactions.txHash,
        status: transactions.status,
        createdAt: transactions.createdAt,
        buyerEmail: users.email,
        buyerName: users.name,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.fromUserId, users.id))
      .where(eq(transactions.type, "purchase"))
      .orderBy(desc(transactions.createdAt))
      .limit(50);

    // Avg order size
    const avgOrderSize =
      purchaseTxs.length > 0
        ? purchaseTxs.reduce(
            (s, tx) => s + parseFloat(tx.amountUsdc || "0"),
            0
          ) / purchaseTxs.length
        : 0;

    return NextResponse.json({
      issuer: {
        companyName: issuer.companyName,
        walletAddress: issuerAddress,
        kybStatus: issuer.kybStatus,
      },
      stats: {
        totalTokensSold: totalSold,
        totalRevenue,
        onChainUsdc,
        totalUsdcReceived,
        totalInvestors,
        totalSupply,
        avgOrderSize,
        tokensRemaining: totalSupply - totalSold,
      },
      tokenAnalytics,
      investors,
      transactions: issuerTxs,
      purchaseHistory: purchaseTxs,
    });
  } catch (error) {
    console.error("GET /api/issuer/dashboard error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
