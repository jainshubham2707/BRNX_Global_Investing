import { NextResponse } from "next/server";
import { db } from "@/db";
import { tokens, issuers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db
      .select({
        id: tokens.id,
        name: tokens.name,
        description: tokens.description,
        priceUsd: tokens.priceUsd,
        totalSupply: tokens.totalSupply,
        soldCount: tokens.soldCount,
        imageUrl: tokens.imageUrl,
        issuerName: issuers.companyName,
      })
      .from(tokens)
      .leftJoin(issuers, eq(tokens.issuerId, issuers.id));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/tokens error:", error);
    return NextResponse.json([]);
  }
}
