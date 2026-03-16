import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        kycStatus: users.kycStatus,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/admin/kyc-list error:", error);
    return NextResponse.json([]);
  }
}
