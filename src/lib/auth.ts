import { NextRequest } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

interface PrivyUser {
  id: string;
  email?: string;
  walletAddress?: string;
}

export async function getPrivyUser(req: NextRequest): Promise<PrivyUser | null> {
  try {
    const authHeader = req.headers.get("authorization");
    const cookie = req.cookies.get("privy-token")?.value;
    const token = authHeader?.replace("Bearer ", "") || cookie;

    if (!token) return null;

    const verifiedClaims = await privy.verifyAuthToken(token);
    const userId = verifiedClaims.userId;

    // Get user details from Privy
    const user = await privy.getUser(userId);
    const email = user.email?.address;
    const wallet = user.wallet?.address;

    return { id: userId, email, walletAddress: wallet };
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}
