"use client";

import { useAuth as usePrivy } from "@/lib/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/utils";
import { Briefcase, Building2, Store } from "lucide-react";
import Link from "next/link";

interface PortfolioItem {
  id: string;
  tokenName: string;
  quantity: number;
  avgPrice: string;
  totalValue: string;
  purchaseDate: string;
}

export default function PortfolioPage() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && !authenticated) router.push("/");
  }, [ready, authenticated, router]);

  useEffect(() => {
    async function fetchPortfolio() {
      try {
        const res = await fetch("/api/user/portfolio");
        if (res.ok) {
          const data = await res.json();
          setItems(data);
        }
      } catch {} finally {
        setLoading(false);
      }
    }
    if (authenticated) fetchPortfolio();
  }, [authenticated]);

  if (!ready || !authenticated) return null;

  const totalValue = items.reduce((sum, item) => sum + parseFloat(item.totalValue || "0"), 0);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Portfolio</h1>
            <p className="text-slate-500 mt-1">Your tokenized asset holdings</p>
          </div>
          <Link href="/marketplace">
            <Button className="gap-2"><Store className="w-4 h-4" /> Browse Marketplace</Button>
          </Link>
        </div>

        {/* Total Value */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-0">
          <CardContent className="py-8">
            <p className="text-slate-400 text-sm">Total Portfolio Value</p>
            <p className="text-3xl font-bold mt-1">{formatUsd(totalValue)}</p>
            <p className="text-slate-400 text-sm mt-1">{items.length} asset{items.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>

        {/* Holdings */}
        {items.length === 0 && !loading ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-slate-900 mb-1">No assets yet</h2>
              <p className="text-sm text-slate-500 mb-6">Start investing by browsing the marketplace.</p>
              <Link href="/marketplace">
                <Button>Explore Assets</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{item.tokenName}</h3>
                      <p className="text-xs text-slate-400">Purchased {new Date(item.purchaseDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{item.quantity} tokens</p>
                      <p className="text-sm text-slate-500">{formatUsd(parseFloat(item.totalValue))}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
