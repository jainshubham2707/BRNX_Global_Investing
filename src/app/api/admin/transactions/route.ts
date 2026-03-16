import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt))
      .limit(50);

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/admin/transactions error:", error);
    return NextResponse.json([]);
  }
}
