import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { instantPayRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPrivyUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const privyUser = await getPrivyUser(req);
    if (!privyUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { requestId, transactionId, receiptFilename } = await req.json();

    await db.update(instantPayRequests).set({
      status: "receipt_uploaded",
      receiptFilename: receiptFilename || null,
      receiptUrl: transactionId,
      updatedAt: new Date(),
    }).where(eq(instantPayRequests.id, requestId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/instant-pay/upload-receipt error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
