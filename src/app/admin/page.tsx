"use client";

import { useAuth as usePrivy } from "@/lib/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUsd, formatAed } from "@/lib/utils";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Users,
  RefreshCw,
  CreditCard,
  Link2,
  ExternalLink,
  Wallet,
  Copy,
  Banknote,
} from "lucide-react";

interface UserEntry {
  id: string;
  email: string;
  name: string;
  role: string;
  walletAddress: string | null;
  kycStatus: string;
  balanceUsdc: string;
  onChainUsdc: string;
  createdAt: string;
}

interface KycSubmission {
  id: string;
  email: string;
  name: string;
  kycStatus: string;
  createdAt: string;
}

interface Transaction {
  id: string;
  type: string;
  fromEmail?: string;
  toEmail?: string;
  amountUsdc: string;
  status: string;
  createdAt: string;
}

interface AedLedger {
  totalAedReceived: number;
  totalUsdcSent: number;
  totalFeesAed: number;
  entries: Array<{
    id: string;
    type: string;
    amountUsdc: string;
    aedAmount: string | null;
    feeUsdc: string | null;
    exchangeRate: string | null;
    txHash: string;
    userEmail: string | null;
    description: string | null;
    createdAt: string;
  }>;
}

type Tab = "buyers" | "aed_ledger" | "kyc" | "instant_pay" | "onchain" | "transactions";

export default function AdminPage() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("buyers");
  const [userList, setUserList] = useState<UserEntry[]>([]);
  const [kycList, setKycList] = useState<KycSubmission[]>([]);
  const [instantPayList, setInstantPayList] = useState<any[]>([]);
  const [onchainTxList, setOnchainTxList] = useState<any[]>([]);
  const [txList, setTxList] = useState<Transaction[]>([]);
  const [aedLedger, setAedLedger] = useState<AedLedger | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  // Platform wallet
  const [platformWallet, setPlatformWallet] = useState<{
    platform: { address: string; balanceUsdc: string };
    issuer: { address: string; balanceUsdc: string };
  } | null>(null);

  useEffect(() => {
    if (ready && !authenticated) router.push("/");
  }, [ready, authenticated, router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) setUserList(await res.json());
    } catch {} finally { setLoading(false); }
  };

  const fetchOnchainTxs = async () => {
    try {
      const res = await fetch("/api/admin/onchain-txs");
      if (res.ok) setOnchainTxList(await res.json());
    } catch {}
  };

  const fetchInstantPay = async () => {
    try {
      const res = await fetch("/api/admin/instant-pay-requests");
      if (res.ok) setInstantPayList(await res.json());
    } catch {}
  };

  const fetchKyc = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/kyc-list");
      if (res.ok) setKycList(await res.json());
    } catch {} finally { setLoading(false); }
  };

  const fetchTx = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/transactions");
      if (res.ok) setTxList(await res.json());
    } catch {} finally { setLoading(false); }
  };

  const fetchAedLedger = async () => {
    try {
      const res = await fetch("/api/admin/aed-ledger");
      if (res.ok) setAedLedger(await res.json());
    } catch {}
  };

  const fetchPlatformWallet = async () => {
    try {
      const res = await fetch("/api/admin/platform-wallet");
      if (res.ok) setPlatformWallet(await res.json());
    } catch {}
  };

  useEffect(() => {
    if (authenticated) {
      fetchPlatformWallet();
      fetchUsers();
      fetchAedLedger();
      fetchKyc();
      fetchInstantPay();
      fetchOnchainTxs();
      fetchTx();
    }
  }, [authenticated]);

  const handleInstantPayAction = async (requestId: string, action: "approve" | "reject") => {
    setActionLoading(requestId);
    try {
      const res = await fetch("/api/admin/approve-instant-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        fetchInstantPay();
        fetchUsers();
        fetchTx();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleKycAction = async (userId: string, action: "approved" | "rejected") => {
    await fetch("/api/admin/approve-kyc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status: action }),
    });
    fetchKyc();
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddr(address);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  if (!ready || !authenticated) return null;

  const buyers = userList.filter((u) => u.role === "buyer");
  const pendingInstantPay = instantPayList.filter((r: any) => r.status === "receipt_uploaded").length;

  const tabs: { id: Tab; label: string; icon: React.ComponentType<any> }[] = [
    { id: "buyers", label: `Buyers (${buyers.length})`, icon: Users },
    { id: "aed_ledger", label: "AED Received", icon: Banknote },
    { id: "kyc", label: "KYC", icon: ShieldCheck },
    { id: "instant_pay", label: `Instant Pay${pendingInstantPay > 0 ? ` (${pendingInstantPay})` : ""}`, icon: CreditCard },
    { id: "onchain", label: "On-Chain Txs", icon: Link2 },
    { id: "transactions", label: "Transactions", icon: RefreshCw },
  ];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
        </div>

        {/* Platform Wallet */}
        {platformWallet && (
          <Card className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white border-0">
            <CardContent className="py-5">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-indigo-400" />
                    <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">Platform Wallet (On-Ramp Pool)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-slate-300">{platformWallet.platform.address}</code>
                    <button onClick={() => copyAddress(platformWallet.platform.address)} className="text-slate-500 hover:text-white transition-colors">
                      {copiedAddr === platformWallet.platform.address ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                      {formatUsd(parseFloat(platformWallet.platform.balanceUsdc))}
                    </span>
                    <span className="text-slate-400 text-xs ml-2">USDC</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-violet-400" />
                    <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">Issuer Wallet (Atlas Capital)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-slate-300">{platformWallet.issuer.address}</code>
                    <button onClick={() => copyAddress(platformWallet.issuer.address)} className="text-slate-500 hover:text-white transition-colors">
                      {copiedAddr === platformWallet.issuer.address ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
                      {formatUsd(parseFloat(platformWallet.issuer.balanceUsdc))}
                    </span>
                    <span className="text-slate-400 text-xs ml-2">USDC</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === t.id ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Buyers Tab */}
        {tab === "buyers" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Buyers</h2>
                <p className="text-sm text-slate-500">{buyers.length} registered buyer{buyers.length !== 1 ? "s" : ""}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchUsers}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {buyers.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No buyers registered yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 text-xs text-slate-400 uppercase tracking-wider font-medium">Buyer</th>
                        <th className="text-left py-3 text-xs text-slate-400 uppercase tracking-wider font-medium">Wallet Address</th>
                        <th className="text-right py-3 text-xs text-slate-400 uppercase tracking-wider font-medium">DB Balance</th>
                        <th className="text-right py-3 text-xs text-slate-400 uppercase tracking-wider font-medium">On-Chain USDC</th>
                        <th className="text-left py-3 text-xs text-slate-400 uppercase tracking-wider font-medium">KYC</th>
                        <th className="text-left py-3 text-xs text-slate-400 uppercase tracking-wider font-medium">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buyers.map((u) => (
                        <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="py-3">
                            <p className="font-medium text-slate-900">{u.name || u.email.split("@")[0]}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </td>
                          <td className="py-3">
                            {u.walletAddress ? (
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">
                                  {u.walletAddress}
                                </code>
                                <button
                                  onClick={() => copyAddress(u.walletAddress!)}
                                  className="text-slate-400 hover:text-indigo-600 transition-colors flex-shrink-0"
                                >
                                  {copiedAddr === u.walletAddress ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">No wallet yet</span>
                            )}
                          </td>
                          <td className="py-3 text-right font-medium text-slate-900">
                            {formatUsd(parseFloat(u.balanceUsdc || "0"))}
                          </td>
                          <td className="py-3 text-right">
                            <span className="font-medium text-emerald-600">
                              {parseFloat(u.onChainUsdc) > 0 ? formatUsd(parseFloat(u.onChainUsdc)) : "$0.00"}
                            </span>
                          </td>
                          <td className="py-3">
                            <Badge variant={
                              u.kycStatus === "approved" ? "success" :
                              u.kycStatus === "pending" ? "warning" :
                              u.kycStatus === "rejected" ? "danger" : "default"
                            }>
                              {u.kycStatus}
                            </Badge>
                          </td>
                          <td className="py-3 text-xs text-slate-400">
                            {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* AED Received Tab */}
        {tab === "aed_ledger" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="py-5">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Total AED Received</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">
                    {formatAed(aedLedger?.totalAedReceived || 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-5">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Total USDC Sent to Buyers</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-1">
                    {formatUsd(aedLedger?.totalUsdcSent || 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-5">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Total Fees Earned (AED)</p>
                  <p className="text-3xl font-bold text-indigo-600 mt-1">
                    {formatAed(aedLedger?.totalFeesAed || 0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Ledger Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">AED Inflow Ledger</h2>
                  <p className="text-sm text-slate-500">Every AED received from buyer on-ramps and instant pay</p>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchAedLedger}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {!aedLedger?.entries.length ? (
                  <p className="text-slate-400 text-center py-8">No AED received yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 text-xs text-slate-400 uppercase tracking-wider font-medium">Type</th>
                          <th className="text-left py-3 text-xs text-slate-400 uppercase tracking-wider font-medium">Buyer</th>
                          <th className="text-right py-3 text-xs text-slate-400 uppercase tracking-wider font-medium">AED Received</th>
                          <th className="text-right py-3 text-xs text-slate-400 uppercase tracking-wider font-medium">Fee (AED)</th>
                          <th className="text-right py-3 text-xs text-slate-400 uppercase tracking-wider font-medium">USDC Sent</th>
                          <th className="text-left py-3 text-xs text-slate-400 uppercase tracking-wider font-medium">Rate</th>
                          <th className="text-left py-3 text-xs text-slate-400 uppercase tracking-wider font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aedLedger.entries.map((entry) => {
                          const feeAed = parseFloat(entry.feeUsdc || "0") * parseFloat(entry.exchangeRate || "3.6725");
                          return (
                            <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                              <td className="py-3">
                                <Badge variant={entry.type === "onramp_credit" ? "success" : "info"}>
                                  {entry.type === "onramp_credit" ? "On-Ramp" : "Instant Pay"}
                                </Badge>
                              </td>
                              <td className="py-3 text-slate-900 font-medium text-xs">
                                {entry.userEmail || "—"}
                              </td>
                              <td className="py-3 text-right font-semibold text-slate-900">
                                {formatAed(parseFloat(entry.aedAmount || "0"))}
                              </td>
                              <td className="py-3 text-right text-indigo-600 font-medium">
                                {formatAed(feeAed)}
                              </td>
                              <td className="py-3 text-right text-emerald-600 font-medium">
                                {formatUsd(parseFloat(entry.amountUsdc || "0"))}
                              </td>
                              <td className="py-3 text-xs text-slate-400">
                                1 USD = {entry.exchangeRate || "3.6725"} AED
                              </td>
                              <td className="py-3 text-xs text-slate-400">
                                {new Date(entry.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* KYC Tab */}
        {tab === "kyc" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">KYC Submissions</h2>
              <Button variant="ghost" size="sm" onClick={fetchKyc}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {kycList.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No KYC submissions yet</p>
              ) : (
                <div className="space-y-3">
                  {kycList.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="font-medium text-slate-900">{item.name || item.email}</p>
                        <p className="text-xs text-slate-400">{item.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          item.kycStatus === "approved" ? "success" :
                          item.kycStatus === "rejected" ? "danger" :
                          item.kycStatus === "pending" ? "warning" : "default"
                        }>
                          {item.kycStatus}
                        </Badge>
                        {item.kycStatus === "pending" && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleKycAction(item.id, "approved")}>
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => handleKycAction(item.id, "rejected")}>
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instant Pay Tab */}
        {tab === "instant_pay" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Instant Pay Requests</h2>
              <Button variant="ghost" size="sm" onClick={fetchInstantPay}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {instantPayList.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No instant pay requests yet</p>
              ) : (
                <div className="space-y-4">
                  {instantPayList.map((req: any) => (
                    <div key={req.id} className="border border-slate-100 rounded-xl p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{req.userName || req.userEmail}</p>
                          <p className="text-xs text-slate-400">{req.userEmail}</p>
                        </div>
                        <Badge variant={
                          req.status === "completed" ? "success" :
                          req.status === "receipt_uploaded" ? "warning" :
                          req.status === "rejected" ? "danger" :
                          req.status === "pending_transfer" ? "info" : "default"
                        }>
                          {req.status === "receipt_uploaded" ? "Receipt Uploaded — Awaiting Approval" :
                           req.status === "pending_transfer" ? "Awaiting Transfer" :
                           req.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-4 gap-4 bg-slate-50 rounded-lg p-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-400">Token</p>
                          <p className="font-medium text-slate-900 text-xs">{req.tokenName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Qty</p>
                          <p className="font-medium text-slate-900">{req.quantity}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Amount (USD)</p>
                          <p className="font-medium text-slate-900">{formatUsd(parseFloat(req.amountUsd))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Amount (AED)</p>
                          <p className="font-medium text-slate-900">AED {parseFloat(req.amountAed).toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Bank Ref: </span>
                          <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">{req.bankReference}</code>
                        </div>
                        {req.receiptUrl && (
                          <div>
                            <span className="text-slate-400">Tx ID: </span>
                            <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">{req.receiptUrl}</code>
                          </div>
                        )}
                        {req.receiptFilename && (
                          <div>
                            <span className="text-slate-400">Receipt: </span>
                            <span className="text-xs text-indigo-600">{req.receiptFilename}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-slate-400">
                        Created {new Date(req.createdAt).toLocaleString()}
                      </div>

                      {req.status === "receipt_uploaded" && (
                        <div className="flex gap-3 pt-2 border-t border-slate-100">
                          <Button
                            size="sm"
                            loading={actionLoading === req.id}
                            onClick={() => handleInstantPayAction(req.id, "approve")}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" /> Approve & Execute
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleInstantPayAction(req.id, "reject")}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* On-Chain Transactions Tab */}
        {tab === "onchain" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">On-Chain Transactions</h2>
                <p className="text-sm text-slate-500">USDC transfers on Base Sepolia testnet</p>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchOnchainTxs}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {onchainTxList.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No on-chain transactions yet</p>
              ) : (
                <div className="space-y-3">
                  {onchainTxList.map((tx: any) => (
                    <div key={tx.id} className="border border-slate-100 rounded-xl p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            tx.type === "onramp_credit" ? "success" :
                            tx.type === "instant_pay_credit" ? "info" :
                            tx.type === "instant_pay_debit" ? "warning" :
                            tx.type === "wallet_pay" ? "danger" : "default"
                          }>
                            {tx.type.replace(/_/g, " ")}
                          </Badge>
                          {tx.userEmail && <span className="text-xs text-slate-400">{tx.userEmail}</span>}
                        </div>
                        <span className="font-semibold text-slate-900">{formatUsd(parseFloat(tx.amountUsdc))} USDC</span>
                      </div>

                      <p className="text-sm text-slate-600">{tx.description}</p>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400">From: </span>
                          <code className="bg-slate-50 px-1.5 py-0.5 rounded">
                            {tx.fromAddress.slice(0, 6)}...{tx.fromAddress.slice(-4)}
                          </code>
                        </div>
                        <div>
                          <span className="text-slate-400">To: </span>
                          <code className="bg-slate-50 px-1.5 py-0.5 rounded">
                            {tx.toAddress.slice(0, 6)}...{tx.toAddress.slice(-4)}
                          </code>
                        </div>
                      </div>

                      {tx.aedAmount && (
                        <div className="text-xs text-slate-400">
                          AED {parseFloat(tx.aedAmount).toFixed(2)} @ rate {tx.exchangeRate} | Fee: {parseFloat(tx.feeUsdc || 0).toFixed(6)} USDC
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">{new Date(tx.createdAt).toLocaleString()}</span>
                        {tx.txHash && !tx.txHash.startsWith("0x_") && (
                          <a
                            href={`https://sepolia.basescan.org/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                          >
                            View on BaseScan <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Transactions Tab */}
        {tab === "transactions" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">All Transactions</h2>
              <Button variant="ghost" size="sm" onClick={fetchTx}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {txList.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No transactions yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2 text-slate-500 font-medium">Type</th>
                        <th className="text-left py-2 text-slate-500 font-medium">Amount</th>
                        <th className="text-left py-2 text-slate-500 font-medium">Status</th>
                        <th className="text-left py-2 text-slate-500 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txList.map((tx) => (
                        <tr key={tx.id} className="border-b border-slate-50">
                          <td className="py-3 capitalize">{tx.type}</td>
                          <td className="py-3">{formatUsd(parseFloat(tx.amountUsdc || "0"))}</td>
                          <td className="py-3">
                            <Badge variant={tx.status === "completed" ? "success" : "warning"}>{tx.status}</Badge>
                          </td>
                          <td className="py-3 text-slate-400">{new Date(tx.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
