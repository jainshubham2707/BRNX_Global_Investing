import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, onchainTransactions, users } from "@/db/schema";
import { getIssuerAddress, getAdminAddress, transferUsdc } from "@/lib/chain";
import { getPrivyUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const privyUser = await getPrivyUser(req);
    if (!privyUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [authUser] = await db
      .select()
      .from(users)
      .where(eq(users.privyId, privyUser.id))
      .limit(1);
    if (!authUser || authUser.role !== "issuer")
      return NextResponse.json({ error: "Issuer access only" }, { status: 403 });

    const { amount } = await req.json();
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0)
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const issuerPk = process.env.ISSUER_WALLET_PRIVATE_KEY;
    if (!issuerPk || issuerPk.includes("here"))
      return NextResponse.json(
        { error: "Issuer wallet not configured" },
        { status: 500 }
      );

    const adminAddress = getAdminAddress();
    if (!adminAddress)
      return NextResponse.json(
        { error: "Platform wallet not configured" },
        { status: 500 }
      );

    // Create a pending transaction record
    const [txRecord] = await db
      .insert(transactions)
      .values({
        type: "offramp",
        fromUserId: authUser.id,
        amountUsdc: amountNum.toFixed(6),
        amountFiat: amountNum.toFixed(2),
        fiatCurrency: "USD",
        status: "processing",
        metadata: JSON.stringify({
          issuerWallet: getIssuerAddress(),
          platformWallet: adminAddress,
        }),
      })
      .returning();

    // Transfer USDC from issuer wallet → platform (admin) wallet
    try {
      const { txHash } = await transferUsdc(issuerPk, adminAddress, amountNum);

      const issuerAddress = getIssuerAddress();

      // Update transaction with hash and completed status
      await db
        .update(transactions)
        .set({ txHash, status: "completed" })
        .where(eq(transactions.id, txRecord.id));

      // Also record in onchainTransactions so it shows in admin On-Chain Txs tab
      await db.insert(onchainTransactions).values({
        type: "offramp",
        fromAddress: issuerAddress,
        toAddress: adminAddress,
        amountUsdc: amountNum.toFixed(6),
        txHash,
        chain: "base_sepolia",
        relatedUserId: authUser.id,
        description: `Offramp: ${amountNum.toFixed(2)} USDC from issuer to platform wallet`,
      });

      return NextResponse.json({
        success: true,
        txHash,
        amount: amountNum,
        transactionId: txRecord.id,
      });
    } catch (chainError: any) {
      // Mark transaction as failed
      await db
        .update(transactions)
        .set({
          status: "failed",
          metadata: JSON.stringify({
            issuerWallet: getIssuerAddress(),
            platformWallet: adminAddress,
            error: chainError.message,
          }),
        })
        .where(eq(transactions.id, txRecord.id));

      console.error("Off-ramp chain transfer failed:", chainError);
      return NextResponse.json(
        { error: "On-chain transfer failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("POST /api/issuer/offramp error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
