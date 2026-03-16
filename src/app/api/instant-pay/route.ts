import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, tokens, instantPayRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPrivyUser } from "@/lib/auth";
import { usdToAedWithFee } from "@/lib/chain";

export async function POST(req: NextRequest) {
  try {
    const privyUser = await getPrivyUser(req);
    if (!privyUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { tokenId, quantity } = await req.json();

    const [user] = await db.select().from(users).where(eq(users.privyId, privyUser.id)).limit(1);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [token] = await db.select().from(tokens).where(eq(tokens.id, tokenId)).limit(1);
    if (!token) return NextResponse.json({ error: "Token not found" }, { status: 404 });

    const amountUsd = parseFloat(token.priceUsd) * quantity;
    const conv = usdToAedWithFee(amountUsd);
    const bankReference = `BL-IP-${Date.now().toString(36).toUpperCase()}`;

    const [request] = await db.insert(instantPayRequests).values({
      userId: user.id,
      tokenId,
      quantity,
      amountUsd: String(amountUsd),
      amountAed: String(conv.totalAed.toFixed(2)),
      status: "pending_transfer",
      bankReference,
    }).returning();

    return NextResponse.json({
      id: request.id,
      bankReference,
      amountUsd: amountUsd.toFixed(2),
      baseAed: conv.baseAed.toFixed(2),
      feeAed: conv.feeAed.toFixed(4),
      totalAed: conv.totalAed.toFixed(2),
      rate: conv.rate,
      feeBps: conv.feeBps,
    });
  } catch (error) {
    console.error("POST /api/instant-pay error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
