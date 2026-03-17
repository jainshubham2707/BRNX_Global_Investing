import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  parseUnits,
  type Hash,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// ── Clients ────────────────────────────────────────────────────────────

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

function getWalletClient(privateKey: string) {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });
}

function getAdminWalletClient() {
  const pk = process.env.ADMIN_WALLET_PRIVATE_KEY;
  if (!pk || pk.includes("here")) throw new Error("ADMIN_WALLET_PRIVATE_KEY not configured");
  return getWalletClient(pk);
}

function getIssuerWalletClient() {
  const pk = process.env.ISSUER_WALLET_PRIVATE_KEY;
  if (!pk || pk.includes("here")) throw new Error("ISSUER_WALLET_PRIVATE_KEY not configured");
  return getWalletClient(pk);
}

// ── Constants ──────────────────────────────────────────────────────────

const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS ||
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as `0x${string}`;

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// ── Addresses ──────────────────────────────────────────────────────────

export function getAdminAddress(): string {
  return process.env.ADMIN_WALLET_ADDRESS || "";
}

export function getIssuerAddress(): string {
  return process.env.ISSUER_WALLET_ADDRESS || "";
}

// ── USDC Balance ───────────────────────────────────────────────────────

export async function getUsdcBalance(address: string): Promise<string> {
  try {
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    });
    return formatUnits(balance, 6);
  } catch (error) {
    console.error(`Failed to get USDC balance for ${address}:`, error);
    return "0";
  }
}

// ── ETH Balance ───────────────────────────────────────────────────────

export async function getEthBalance(address: string): Promise<string> {
  try {
    const balance = await publicClient.getBalance({ address: address as `0x${string}` });
    return formatUnits(balance, 18);
  } catch (error) {
    console.error(`Failed to get ETH balance for ${address}:`, error);
    return "0";
  }
}

// ── USDC Transfers ─────────────────────────────────────────────────────

export async function transferUsdc(
  fromPrivateKey: string,
  toAddress: string,
  amountUsdc: number
): Promise<{ txHash: Hash }> {
  const walletClient = getWalletClient(fromPrivateKey);
  const amount = parseUnits(amountUsdc.toFixed(6), 6);

  const txHash = await walletClient.writeContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [toAddress as `0x${string}`, amount],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { txHash };
}

/** Platform wallet → user wallet (on-ramp) */
export async function transferUsdcFromAdmin(
  toAddress: string,
  amountUsdc: number
): Promise<{ txHash: Hash }> {
  return transferUsdc(process.env.ADMIN_WALLET_PRIVATE_KEY!, toAddress, amountUsdc);
}

/** Buyer's wallet → Issuer wallet (token purchase) using buyer's private key */
export async function transferUsdcFromBuyerToIssuer(
  buyerWalletAddress: string,
  amountUsdc: number
): Promise<{ txHash: Hash }> {
  const buyerPk = process.env.BUYER_WALLET_PRIVATE_KEY;
  if (!buyerPk) throw new Error("BUYER_WALLET_PRIVATE_KEY not configured");
  return transferUsdc(buyerPk, getIssuerAddress(), amountUsdc);
}

// ── AED ↔ USD conversion with fee ──────────────────────────────────────

const USD_AED_RATE = parseFloat(process.env.NEXT_PUBLIC_USD_AED_RATE || "3.6725");
const FEE_BPS = parseInt(process.env.TRANSACTION_FEE_BPS || "15");

/**
 * Given AED amount paid by user (including fee), calculate net USD/USDC
 * User pays: baseAed + 15bps fee = totalAed
 * So: netAed = totalAed / (1 + 15/10000), netUsd = netAed / rate
 */
export function aedToUsdcConversion(aedPaid: number) {
  const netAed = aedPaid / (1 + FEE_BPS / 10000);
  const feeAed = aedPaid - netAed;
  const netUsd = netAed / USD_AED_RATE;
  return {
    aedPaid,
    netAed,
    feeAed,
    netUsd, // = USDC amount to credit
    rate: USD_AED_RATE,
    feeBps: FEE_BPS,
  };
}

/**
 * Given USD amount, calculate AED the user needs to pay (including fee on top)
 * baseAed = usd × rate, totalAed = baseAed × (1 + 15/10000)
 */
export function usdToAedWithFee(usd: number) {
  const baseAed = usd * USD_AED_RATE;
  const feeAed = baseAed * (FEE_BPS / 10000);
  const totalAed = baseAed + feeAed;
  return {
    usd,
    baseAed,
    feeAed,
    totalAed, // what user pays
    rate: USD_AED_RATE,
    feeBps: FEE_BPS,
  };
}
