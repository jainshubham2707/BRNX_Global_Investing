import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getUsdcBalance } from "@/lib/chain";

export async function GET() {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        walletAddress: users.walletAddress,
        kycStatus: users.kycStatus,
        balanceUsdc: users.balanceUsdc,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    // Fetch on-chain USDC balances on Base Sepolia
    const usersWithBalances = await Promise.all(
      allUsers.map(async (user) => {
        let onChainUsdc = "0";
        if (user.walletAddress) {
          onChainUsdc = await getUsdcBalance(user.walletAddress);
        }
        return { ...user, onChainUsdc };
      })
    );

    return NextResponse.json(usersWithBalances);
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json([]);
  }
}
