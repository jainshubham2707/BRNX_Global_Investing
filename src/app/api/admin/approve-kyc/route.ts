import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { userId, status } = await req.json();

    await db.update(users).set({
      kycStatus: status,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/admin/approve-kyc error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
