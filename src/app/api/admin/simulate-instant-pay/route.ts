import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, tokens, transactions, portfolio } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { email, tokenId, quantity } = await req.json();

    // 1. Find user
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 2. Find token
    const [token] = await db.select().from(tokens).where(eq(tokens.id, tokenId)).limit(1);
    if (!token) return NextResponse.json({ error: "Token not found" }, { status: 404 });

    const totalCost = parseFloat(token.priceUsd) * quantity;

    // 3. Simulate on-ramp: credit buyer
    const newBalance = parseFloat(user.balanceUsdc || "0") + totalCost;
    await db.update(users).set({
      balanceUsdc: String(newBalance),
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));

    await db.insert(transactions).values({
      type: "onramp",
      toUserId: user.id,
      amountUsdc: String(totalCost),
      status: "completed",
      metadata: JSON.stringify({ source: "instant_payment_simulation" }),
    });

    // 4. Transfer to issuer (deduct from buyer)
    await db.update(users).set({
      balanceUsdc: String(newBalance - totalCost),
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));

    await db.insert(transactions).values({
      type: "transfer",
      fromUserId: user.id,
      amountUsdc: String(totalCost),
      status: "completed",
      metadata: JSON.stringify({ tokenId, instant: true }),
    });

    // 5. Mint tokens to buyer
    const [existing] = await db
      .select()
      .from(portfolio)
      .where(and(eq(portfolio.userId, user.id), eq(portfolio.tokenId, tokenId)))
      .limit(1);

    if (existing) {
      await db.update(portfolio).set({
        quantity: (existing.quantity || 0) + quantity,
        updatedAt: new Date(),
      }).where(eq(portfolio.id, existing.id));
    } else {
      await db.insert(portfolio).values({
        userId: user.id,
        tokenId,
        quantity,
        avgPurchasePrice: token.priceUsd,
      });
    }

    await db.update(tokens).set({
      soldCount: sql`${tokens.soldCount} + ${quantity}`,
    }).where(eq(tokens.id, tokenId));

    // 6. Record purchase
    await db.insert(transactions).values({
      type: "purchase",
      fromUserId: user.id,
      amountUsdc: String(totalCost),
      status: "completed",
      metadata: JSON.stringify({ tokenId, quantity, mode: "instant" }),
    });

    return NextResponse.json({ success: true, steps: ["onramp", "transfer", "mint", "purchase"] });
  } catch (error) {
    console.error("POST /api/admin/simulate-instant-pay error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
