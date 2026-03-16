import { NextResponse } from "next/server";
import { getUsdcBalance, getAdminAddress, getIssuerAddress } from "@/lib/chain";

export async function GET() {
  try {
    const adminAddress = getAdminAddress();
    const issuerAddress = getIssuerAddress();

    const [adminBalance, issuerBalance] = await Promise.all([
      getUsdcBalance(adminAddress),
      getUsdcBalance(issuerAddress),
    ]);

    return NextResponse.json({
      platform: { address: adminAddress, balanceUsdc: adminBalance },
      issuer: { address: issuerAddress, balanceUsdc: issuerBalance },
    });
  } catch (error) {
    console.error("GET /api/admin/platform-wallet error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
