import { NextResponse } from "next/server";
import { db } from "@/db";
import { instantPayRequests, users, tokens } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db
      .select({
        id: instantPayRequests.id,
        userEmail: users.email,
        userName: users.name,
        tokenName: tokens.name,
        quantity: instantPayRequests.quantity,
        amountUsd: instantPayRequests.amountUsd,
        amountAed: instantPayRequests.amountAed,
        status: instantPayRequests.status,
        bankReference: instantPayRequests.bankReference,
        receiptUrl: instantPayRequests.receiptUrl,
        receiptFilename: instantPayRequests.receiptFilename,
        createdAt: instantPayRequests.createdAt,
      })
      .from(instantPayRequests)
      .leftJoin(users, eq(instantPayRequests.userId, users.id))
      .leftJoin(tokens, eq(instantPayRequests.tokenId, tokens.id))
      .orderBy(desc(instantPayRequests.createdAt));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/admin/instant-pay-requests error:", error);
    return NextResponse.json([]);
  }
}
