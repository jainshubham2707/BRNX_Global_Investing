import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, transactions, portfolio } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getPrivyUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const privyUser = await getPrivyUser(req);
    if (!privyUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Find user by privyId first
    let [user] = await db.select().from(users).where(eq(users.privyId, privyUser.id)).limit(1);

    if (!user) {
      const email = privyUser.email || `${privyUser.id}@borderless.app`;

      // Check if a pre-seeded user exists with this email (e.g. issuer, admin)
      const [existingByEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (existingByEmail) {
        // Link the Privy ID and wallet to the pre-seeded record
        await db.update(users).set({
          privyId: privyUser.id,
          walletAddress: privyUser.walletAddress || existingByEmail.walletAddress,
          updatedAt: new Date(),
        }).where(eq(users.id, existingByEmail.id));
        user = { ...existingByEmail, privyId: privyUser.id, walletAddress: privyUser.walletAddress || existingByEmail.walletAddress };
      } else {
        [user] = await db.insert(users).values({
          privyId: privyUser.id,
          email,
          walletAddress: privyUser.walletAddress,
        }).returning();
      }
    }

    // Update wallet address if Privy has one and DB doesn't
    if (privyUser.walletAddress && !user.walletAddress) {
      await db.update(users).set({
        walletAddress: privyUser.walletAddress,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));
      user = { ...user, walletAddress: privyUser.walletAddress };
    }

    // Get recent transactions
    const recentTx = await db
      .select()
      .from(transactions)
      .where(eq(transactions.fromUserId, user.id))
      .orderBy(desc(transactions.createdAt))
      .limit(10);

    // Get portfolio count
    const [portfolioResult] = await db
      .select({ count: sql<number>`coalesce(sum(${portfolio.quantity}), 0)` })
      .from(portfolio)
      .where(eq(portfolio.userId, user.id));

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      walletAddress: user.walletAddress,
      kycStatus: user.kycStatus,
      balanceUsdc: user.balanceUsdc,
      recentTransactions: recentTx,
      portfolioCount: portfolioResult?.count || 0,
    });
  } catch (error) {
    console.error("GET /api/user/me error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
