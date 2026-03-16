import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, portfolio, tokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPrivyUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const privyUser = await getPrivyUser(req);
    if (!privyUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.privyId, privyUser.id)).limit(1);
    if (!user) return NextResponse.json([]);

    const items = await db
      .select({
        id: portfolio.id,
        tokenName: tokens.name,
        quantity: portfolio.quantity,
        avgPrice: portfolio.avgPurchasePrice,
        totalValue: tokens.priceUsd,
        purchaseDate: portfolio.createdAt,
      })
      .from(portfolio)
      .leftJoin(tokens, eq(portfolio.tokenId, tokens.id))
      .where(eq(portfolio.userId, user.id));

    const result = items.map((item) => ({
      ...item,
      totalValue: String(parseFloat(item.totalValue || "250") * (item.quantity || 0)),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/user/portfolio error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
