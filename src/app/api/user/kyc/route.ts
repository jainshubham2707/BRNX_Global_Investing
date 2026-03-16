import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPrivyUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const privyUser = await getPrivyUser(req);
    if (!privyUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fullName, dob, nationality, documentName } = await req.json();

    await db
      .update(users)
      .set({
        name: fullName,
        kycStatus: "pending",
        kycDocumentUrl: documentName,
        kycNotes: JSON.stringify({ dob, nationality }),
        updatedAt: new Date(),
      })
      .where(eq(users.privyId, privyUser.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/user/kyc error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
