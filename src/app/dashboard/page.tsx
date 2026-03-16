"use client";

import { useAuth as usePrivy } from "@/lib/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/utils";
import { PlusCircle, ArrowUpRight, Store, Clock } from "lucide-react";
import Link from "next/link";

interface UserData {
  balanceUsdc: string;
  kycStatus: string;
  recentTransactions: Array<{
    id: string;
    type: string;
    amountUsdc: string;
    status: string;
    createdAt: string;
  }>;
  portfolioCount: number;
}

export default function DashboardPage() {
  const { ready, authenticated, user } = usePrivy();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/user/me");
        if (res.ok) {
          const data = await res.json();
          setUserData(data);
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    }
    if (authenticated) fetchData();
  }, [authenticated]);

  if (!ready || !authenticated) return null;

  const balance = userData?.balanceUsdc || "0";
  const kycStatus = userData?.kycStatus || "none";

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Welcome back{user?.email?.address ? `, ${user.email.address.split("@")[0]}` : ""}
          </p>
        </div>

        {/* KYC Banner */}
        {kycStatus !== "approved" && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-amber-800">
                {kycStatus === "pending" ? "KYC Under Review" : "Complete Your KYC"}
              </p>
              <p className="text-sm text-amber-600 mt-0.5">
                {kycStatus === "pending"
                  ? "Your documents are being reviewed. We'll notify you once approved."
                  : "Verify your identity to start investing."}
              </p>
            </div>
            {kycStatus === "none" && (
              <Link href="/kyc">
                <Button size="sm">Verify Now</Button>
              </Link>
            )}
            {kycStatus === "pending" && <Badge variant="warning">Pending</Badge>}
            {kycStatus === "rejected" && (
              <Link href="/kyc">
                <Button size="sm" variant="danger">Resubmit</Button>
              </Link>
            )}
          </div>
        )}

        {/* Balance + Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-violet-700 border-0 text-white">
            <CardHeader>
              <p className="text-indigo-200 text-sm font-medium">USD Balance</p>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold mb-6">
                {loading ? "..." : formatUsd(parseFloat(balance))}
              </p>
              <div className="flex gap-3">
                <Link href="/add-funds">
                  <Button className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm gap-2">
                    <PlusCircle className="w-4 h-4" /> Add Funds
                  </Button>
                </Link>
                <Link href="/marketplace">
                  <Button className="bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-sm gap-2">
                    <Store className="w-4 h-4" /> Marketplace
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-slate-500 text-sm font-medium">Portfolio</p>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900 mb-2">
                {loading ? "..." : (userData?.portfolioCount || 0)}
              </p>
              <p className="text-sm text-slate-500 mb-4">tokens owned</p>
              <Link href="/portfolio">
                <Button variant="outline" size="sm" className="gap-1">
                  View Portfolio <ArrowUpRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
          </CardHeader>
          <CardContent>
            {!userData?.recentTransactions?.length ? (
              <div className="text-center py-8 text-slate-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userData.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                        {tx.type === "onramp" && <PlusCircle className="w-4 h-4 text-emerald-600" />}
                        {tx.type === "purchase" && <Store className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 capitalize">{tx.type === "onramp" ? "Funds Added" : tx.type}</p>
                        <p className="text-xs text-slate-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {tx.type === "onramp" ? "+" : "-"}{formatUsd(parseFloat(tx.amountUsdc))}
                      </p>
                      <Badge variant={tx.status === "completed" ? "success" : "warning"} className="text-[10px]">
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
