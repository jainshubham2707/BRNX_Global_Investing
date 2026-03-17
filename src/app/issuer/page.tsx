"use client";

import { useAuth as usePrivy } from "@/lib/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/utils";
import {
  Building2,
  Coins,
  DollarSign,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  Users,
  BarChart3,
  ArrowDownRight,
  Wallet,
  ShieldCheck,
  Package,
  ArrowRightLeft,
  Clock,
  ChevronRight,
  Landmark,
} from "lucide-react";

type Tab = "overview" | "tokens" | "investors" | "transactions" | "offramp";

interface TokenAnalytics {
  id: string;
  name: string;
  description: string | null;
  priceUsd: string;
  totalSupply: number;
  soldCount: number;
  remaining: number;
  percentSold: number;
  revenue: number;
  uniqueBuyers: number;
  totalHeld: number;
  avgOrderSize: number;
}

interface Investor {
  userId: string;
  email: string;
  name: string | null;
  holdings: Array<{ tokenName: string; quantity: number; value: number }>;
  totalValue: number;
}

interface PurchaseTx {
  id: string;
  amountUsdc: string;
  txHash: string | null;
  status: string;
  createdAt: string;
  buyerEmail: string;
  buyerName: string | null;
}

interface OfframpTx {
  id: string;
  amountUsdc: string;
  txHash: string | null;
  status: string;
  createdAt: string;
  metadata: string | null;
}

interface OnchainTx {
  id: string;
  type: string;
  fromAddress: string;
  toAddress: string;
  amountUsdc: string;
  txHash: string;
  description: string | null;
  createdAt: string;
}

interface IssuerData {
  issuer: {
    companyName: string;
    walletAddress: string;
    kybStatus: string;
  };
  stats: {
    totalTokensSold: number;
    totalRevenue: number;
    onChainUsdc: string;
    totalUsdcReceived: number;
    totalInvestors: number;
    totalSupply: number;
    avgOrderSize: number;
    tokensRemaining: number;
    totalOfframped: number;
  };
  tokenAnalytics: TokenAnalytics[];
  investors: Investor[];
  transactions: OnchainTx[];
  purchaseHistory: PurchaseTx[];
  offrampHistory: OfframpTx[];
}

const EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL || "https://sepolia.basescan.org";

export default function IssuerDashboardPage() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const [data, setData] = useState<IssuerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (ready && !authenticated) router.push("/");
  }, [ready, authenticated, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/issuer/dashboard");
      if (res.status === 403) {
        setAuthorized(false);
        return;
      }
      if (res.ok) {
        setData(await res.json());
        setAuthorized(true);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) fetchData();
  }, [authenticated]);

  if (!ready || !authenticated) return null;

  if (authorized === false) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto text-center py-20">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-500">This portal is only accessible to RWA token issuers.</p>
          <Button onClick={() => router.push("/dashboard")} className="mt-6">
            Back to Dashboard
          </Button>
        </div>
      </AppShell>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "tokens", label: "Token Analytics", icon: <Coins className="w-4 h-4" /> },
    { id: "investors", label: "Investors", icon: <Users className="w-4 h-4" /> },
    { id: "transactions", label: "Transactions", icon: <ArrowRightLeft className="w-4 h-4" /> },
    { id: "offramp", label: "Off-Ramp", icon: <Landmark className="w-4 h-4" /> },
  ];

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {data?.issuer.companyName || "Issuer Dashboard"}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm text-slate-500">RWA Token Issuer Portal</p>
                {data?.issuer.kybStatus && (
                  <Badge variant={data.issuer.kybStatus === "approved" ? "success" : "warning"}>
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    KYB {data.issuer.kybStatus}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Wallet Banner */}
        {data?.issuer.walletAddress && (
          <Card className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white border-0 overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
            <CardContent className="py-5 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">
                    Custody Wallet (Base Sepolia)
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm font-mono text-slate-300">
                      {data.issuer.walletAddress}
                    </code>
                    <a
                      href={`${EXPLORER_URL}/address/${data.issuer.walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">
                    USDC Balance
                  </p>
                  <p className="text-3xl font-bold mt-1 bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                    {formatUsd(parseFloat(data.stats.onChainUsdc || "0"))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.icon}
              {t.label}
              {t.id === "investors" && data?.stats.totalInvestors ? (
                <span className="bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">
                  {data.stats.totalInvestors}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "overview" && <OverviewTab data={data} />}
        {tab === "tokens" && <TokensTab data={data} />}
        {tab === "investors" && <InvestorsTab data={data} />}
        {tab === "transactions" && <TransactionsTab data={data} />}
        {tab === "offramp" && <OffRampTab data={data} onSuccess={fetchData} />}

      </div>
    </AppShell>
  );
}

/* ─── Overview Tab ──────────────────────────────────────────────────── */

function OverviewTab({ data }: { data: IssuerData | null }) {
  const onChainUsdc = parseFloat(data?.stats.onChainUsdc || "0");
  const totalOfframped = data?.stats.totalOfframped || 0;
  const totalRevenue = onChainUsdc + totalOfframped;

  const stats = [
    {
      label: "Total Revenue",
      value: formatUsd(totalRevenue),
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
      bg: "bg-emerald-50",
      sub: `On-chain ${formatUsd(onChainUsdc)} + Offramped ${formatUsd(totalOfframped)}`,
    },
    {
      label: "Tokens Sold",
      value: `${data?.stats.totalTokensSold || 0}`,
      icon: <Coins className="w-5 h-5 text-indigo-600" />,
      bg: "bg-indigo-50",
      sub: `${(data?.stats.tokensRemaining || 0).toLocaleString()} remaining of ${(data?.stats.totalSupply || 0).toLocaleString()}`,
    },
    {
      label: "Investors",
      value: `${data?.stats.totalInvestors || 0}`,
      icon: <Users className="w-5 h-5 text-violet-600" />,
      bg: "bg-violet-50",
      sub: `Avg order ${formatUsd(data?.stats.avgOrderSize || 0)}`,
    },
    {
      label: "On-Chain USDC",
      value: formatUsd(onChainUsdc),
      icon: <Wallet className="w-5 h-5 text-teal-600" />,
      bg: "bg-teal-50",
      sub: "Live balance on Base Sepolia",
    },
    {
      label: "USDC Offramped",
      value: formatUsd(totalOfframped),
      icon: <Landmark className="w-5 h-5 text-orange-600" />,
      bg: "bg-orange-50",
      sub: `${data?.offrampHistory?.filter(t => t.status === "completed").length || 0} completed transactions`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid md:grid-cols-5 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="py-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                    {s.label}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
                </div>
                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                  {s.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-column: Token Summary + Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Token Performance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Token Performance</h2>
              <button
                onClick={() => {}}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                View Details
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.tokenAnalytics.map((token) => (
                <div key={token.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{token.name}</p>
                      <p className="text-xs text-slate-400">
                        {formatUsd(parseFloat(token.priceUsd))} / token
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 text-sm">
                        {formatUsd(token.revenue)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {token.soldCount.toLocaleString()} sold / {token.uniqueBuyers} investors
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                        style={{ width: `${token.percentSold}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 text-right">
                      {token.percentSold.toFixed(1)}% sold
                    </p>
                  </div>
                </div>
              ))}
              {!data?.tokenAnalytics.length && (
                <p className="text-slate-400 text-center py-6">No tokens issued yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Purchases */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Recent Purchases</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data?.purchaseHistory.slice(0, 8).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {tx.buyerName || tx.buyerEmail}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(tx.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-600">
                      +{formatUsd(parseFloat(tx.amountUsdc || "0"))}
                    </p>
                    <Badge
                      variant={tx.status === "completed" ? "success" : "warning"}
                    >
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {!data?.purchaseHistory.length && (
                <p className="text-slate-400 text-center py-6">No purchases yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown Bar */}
      {data?.tokenAnalytics && data.tokenAnalytics.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Revenue Breakdown</h2>
          </CardHeader>
          <CardContent>
            <div className="flex h-6 rounded-full overflow-hidden bg-slate-100">
              {data.tokenAnalytics.map((token, i) => {
                const pct =
                  data.stats.totalRevenue > 0
                    ? (token.revenue / data.stats.totalRevenue) * 100
                    : 0;
                const colors = [
                  "bg-emerald-500",
                  "bg-indigo-500",
                  "bg-violet-500",
                  "bg-amber-500",
                  "bg-teal-500",
                ];
                return (
                  <div
                    key={token.id}
                    className={`${colors[i % colors.length]} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${token.name}: ${formatUsd(token.revenue)} (${pct.toFixed(1)}%)`}
                  />
                );
              })}
            </div>
            <div className="flex gap-6 mt-3">
              {data.tokenAnalytics.map((token, i) => {
                const colors = [
                  "bg-emerald-500",
                  "bg-indigo-500",
                  "bg-violet-500",
                  "bg-amber-500",
                  "bg-teal-500",
                ];
                return (
                  <div key={token.id} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`} />
                    <span className="text-xs text-slate-600">{token.name}</span>
                    <span className="text-xs font-semibold text-slate-900">
                      {formatUsd(token.revenue)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Tokens Tab ────────────────────────────────────────────────────── */

function TokensTab({ data }: { data: IssuerData | null }) {
  return (
    <div className="space-y-6">
      {data?.tokenAnalytics.map((token) => (
        <Card key={token.id}>
          <CardContent className="py-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{token.name}</h3>
                    {token.description && (
                      <p className="text-sm text-slate-500 mt-0.5">{token.description}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Price per token</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatUsd(parseFloat(token.priceUsd))}
                </p>
              </div>
            </div>

            {/* Token stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-400">Total Supply</p>
                <p className="text-lg font-bold text-slate-900">
                  {token.totalSupply.toLocaleString()}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-400">Sold</p>
                <p className="text-lg font-bold text-emerald-700">
                  {token.soldCount.toLocaleString()}
                </p>
              </div>
              <div className="bg-amber-50 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-400">Remaining</p>
                <p className="text-lg font-bold text-amber-700">
                  {token.remaining.toLocaleString()}
                </p>
              </div>
              <div className="bg-indigo-50 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-400">Revenue</p>
                <p className="text-lg font-bold text-indigo-700">{formatUsd(token.revenue)}</p>
              </div>
              <div className="bg-violet-50 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-400">Investors</p>
                <p className="text-lg font-bold text-violet-700">{token.uniqueBuyers}</p>
                <p className="text-[10px] text-slate-400">
                  Avg {token.avgOrderSize.toFixed(1)} tokens/buyer
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-500">Sale Progress</span>
                <span className="text-xs font-semibold text-slate-700">
                  {token.percentSold.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    token.percentSold >= 75
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                      : token.percentSold >= 50
                        ? "bg-gradient-to-r from-indigo-500 to-indigo-400"
                        : "bg-gradient-to-r from-amber-500 to-amber-400"
                  }`}
                  style={{ width: `${token.percentSold}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {!data?.tokenAnalytics.length && (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            No tokens have been issued yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Investors Tab ─────────────────────────────────────────────────── */

function InvestorsTab({ data }: { data: IssuerData | null }) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Total Investors</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">
              {data?.stats.totalInvestors || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Avg Investment</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">
              {data?.investors.length
                ? formatUsd(
                    data.investors.reduce((s, i) => s + i.totalValue, 0) / data.investors.length
                  )
                : "$0.00"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Total AUM</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">
              {formatUsd(data?.investors.reduce((s, i) => s + i.totalValue, 0) || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Investor Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Investor Details</h2>
        </CardHeader>
        <CardContent>
          {!data?.investors.length ? (
            <p className="text-slate-400 text-center py-8">No investors yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                      Investor
                    </th>
                    <th className="text-left py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                      Holdings
                    </th>
                    <th className="text-right py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                      Total Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.investors.map((investor) => (
                    <tr
                      key={investor.userId}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-indigo-600">
                              {(investor.name || investor.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            {investor.name && (
                              <p className="font-medium text-slate-900">{investor.name}</p>
                            )}
                            <p className="text-xs text-slate-400">{investor.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="space-y-1">
                          {investor.holdings.map((h, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <Badge variant="info">{h.quantity} tokens</Badge>
                              <span className="text-xs text-slate-500">{h.tokenName}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <p className="font-semibold text-slate-900">
                          {formatUsd(investor.totalValue)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Transactions Tab ──────────────────────────────────────────────── */

function TransactionsTab({ data }: { data: IssuerData | null }) {
  const [filter, setFilter] = useState<"all" | "onchain" | "purchases" | "offramped">("all");

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2">
        {(
          [
            { id: "all", label: "All" },
            { id: "onchain", label: "On-Chain USDC" },
            { id: "purchases", label: "Purchase History" },
            { id: "offramped", label: "USDC Offramped" },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f.id
                ? "bg-indigo-100 text-indigo-700"
                : "bg-slate-50 text-slate-500 hover:text-slate-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* On-chain Transactions */}
      {(filter === "all" || filter === "onchain") && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">
              Incoming USDC Transfers
            </h2>
            <p className="text-sm text-slate-500">
              On-chain USDC received in your custody wallet
            </p>
          </CardHeader>
          <CardContent>
            {!data?.transactions.length ? (
              <p className="text-slate-400 text-center py-8">No on-chain transactions yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                        Type
                      </th>
                      <th className="text-left py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                        From
                      </th>
                      <th className="text-right py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                        Amount
                      </th>
                      <th className="text-left py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                        TX Hash
                      </th>
                      <th className="text-left py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-2">
                          <Badge
                            variant={
                              tx.type === "wallet_pay"
                                ? "success"
                                : tx.type === "instant_pay_debit"
                                  ? "info"
                                  : "default"
                            }
                          >
                            {tx.type.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                            {tx.fromAddress.slice(0, 6)}...{tx.fromAddress.slice(-4)}
                          </code>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="font-semibold text-emerald-600">
                            +{formatUsd(parseFloat(tx.amountUsdc))}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          {tx.txHash && !tx.txHash.startsWith("0x_") ? (
                            <a
                              href={`${EXPLORER_URL}/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-mono"
                            >
                              {tx.txHash.slice(0, 10)}...
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-xs text-slate-500">
                          {new Date(tx.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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

      {/* Purchase History */}
      {(filter === "all" || filter === "purchases") && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Purchase History</h2>
            <p className="text-sm text-slate-500">Token purchases by investors</p>
          </CardHeader>
          <CardContent>
            {!data?.purchaseHistory.length ? (
              <p className="text-slate-400 text-center py-8">No purchases yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                        Buyer
                      </th>
                      <th className="text-right py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                        Amount
                      </th>
                      <th className="text-left py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                        Status
                      </th>
                      <th className="text-left py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.purchaseHistory.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-2">
                          <p className="font-medium text-slate-900">
                            {tx.buyerName || tx.buyerEmail}
                          </p>
                          {tx.buyerName && (
                            <p className="text-xs text-slate-400">{tx.buyerEmail}</p>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="font-semibold text-emerald-600">
                            +{formatUsd(parseFloat(tx.amountUsdc || "0"))}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <Badge
                            variant={tx.status === "completed" ? "success" : "warning"}
                          >
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-xs text-slate-500">
                          {new Date(tx.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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

      {/* USDC Offramped */}
      {(filter === "all" || filter === "offramped") && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">USDC Offramped</h2>
            <p className="text-sm text-slate-500">
              USDC transferred from issuer wallet to platform wallet
            </p>
          </CardHeader>
          <CardContent>
            {!data?.offrampHistory?.length ? (
              <p className="text-slate-400 text-center py-8">No off-ramp transactions yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-right py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                        Amount
                      </th>
                      <th className="text-left py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                        Status
                      </th>
                      <th className="text-left py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                        TX Hash
                      </th>
                      <th className="text-left py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.offrampHistory.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-2 text-right">
                          <span className="font-semibold text-orange-600">
                            -{formatUsd(parseFloat(tx.amountUsdc || "0"))}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <Badge
                            variant={
                              tx.status === "completed"
                                ? "success"
                                : tx.status === "failed"
                                  ? "danger"
                                  : "warning"
                            }
                          >
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          {tx.txHash ? (
                            <a
                              href={`${EXPLORER_URL}/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-mono"
                            >
                              {tx.txHash.slice(0, 10)}...
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-xs text-slate-500">
                          {new Date(tx.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
    </div>
  );
}

/* ─── Off-Ramp Tab ──────────────────────────────────────────────────── */

function OffRampTab({ data, onSuccess }: { data: IssuerData | null; onSuccess: () => void }) {
  const usdcBalance = parseFloat(data?.stats.onChainUsdc || "0");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const handleOfframp = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0 || amountNum > usdcBalance) return;

    setSubmitting(true);
    setError(null);
    setLastTxHash(null);

    try {
      const res = await fetch("/api/issuer/offramp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountNum }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Off-ramp failed");
        return;
      }
      setLastTxHash(result.txHash);
      setAmount("");
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Off-Ramp USDC</h2>
          <p className="text-sm text-slate-500">
            Transfer USDC from your custody wallet to the platform wallet
          </p>
        </CardHeader>
        <CardContent>
          <div className="max-w-lg space-y-6">
            {/* Balance */}
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                Available USDC Balance
              </p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {formatUsd(usdcBalance)}
              </p>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Amount to Off-Ramp (USDC)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={usdcBalance}
                  disabled={submitting}
                  className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                />
              </div>
              <div className="flex gap-2 mt-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() =>
                      setAmount(((usdcBalance * pct) / 100).toFixed(2))
                    }
                    disabled={submitting}
                    className="px-3 py-1 bg-slate-100 rounded-lg text-xs text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Bank Details */}
            <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-indigo-900">
                Destination Bank Account
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-indigo-400">Bank</p>
                  <p className="text-indigo-900 font-medium">JPMorgan Chase</p>
                </div>
                <div>
                  <p className="text-indigo-400">Account</p>
                  <p className="text-indigo-900 font-medium">****4521</p>
                </div>
                <div>
                  <p className="text-indigo-400">Routing</p>
                  <p className="text-indigo-900 font-medium">021000021</p>
                </div>
                <div>
                  <p className="text-indigo-400">Account Holder</p>
                  <p className="text-indigo-900 font-medium">Sunpay Ltd.</p>
                </div>
              </div>
            </div>

            {/* Error / Success */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {lastTxHash && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
                Off-ramp successful!{" "}
                <a
                  href={`${EXPLORER_URL}/tx/${lastTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  View transaction
                </a>
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > usdcBalance || submitting}
                onClick={handleOfframp}
                className="flex-1"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Landmark className="w-4 h-4 mr-2" />
                )}
                {submitting
                  ? "Processing..."
                  : `Initiate Off-Ramp ${amount ? `(${formatUsd(parseFloat(amount))})` : ""}`}
              </Button>
            </div>

            <p className="text-xs text-slate-400 text-center">
              USDC will be transferred from your issuer wallet to the platform wallet at 1:1.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Off-Ramp History */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Off-Ramp History</h2>
        </CardHeader>
        <CardContent>
          {!data?.offrampHistory?.length ? (
            <div className="text-center py-8">
              <Landmark className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No off-ramp transactions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-right py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                      Amount
                    </th>
                    <th className="text-left py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                      Status
                    </th>
                    <th className="text-left py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                      TX Hash
                    </th>
                    <th className="text-left py-3 px-2 text-xs text-slate-400 uppercase tracking-wider font-medium">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.offrampHistory.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-2 text-right">
                        <span className="font-semibold text-orange-600">
                          -{formatUsd(parseFloat(tx.amountUsdc || "0"))}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <Badge
                          variant={
                            tx.status === "completed"
                              ? "success"
                              : tx.status === "failed"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        {tx.txHash ? (
                          <a
                            href={`${EXPLORER_URL}/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-mono"
                          >
                            {tx.txHash.slice(0, 10)}...
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-xs text-slate-500">
                        {new Date(tx.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

