import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, tokens, portfolio } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { email, tokenId, quantity } = await req.json();

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [token] = await db.select().from(tokens).where(eq(tokens.id, tokenId)).limit(1);
    if (!token) return NextResponse.json({ error: "Token not found" }, { status: 404 });

    // Upsert portfolio
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

    // Update sold count
    await db.update(tokens).set({
      soldCount: sql`${tokens.soldCount} + ${quantity}`,
    }).where(eq(tokens.id, tokenId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/admin/trigger-mint error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
