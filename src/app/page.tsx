"use client";

import { useAuth as usePrivy } from "@/lib/hooks";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Globe, Zap, Shield } from "lucide-react";

export default function LandingPage() {
  const { login, authenticated, ready } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) {
      fetch("/api/user/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.role === "issuer") router.push("/issuer");
          else if (data.role === "admin") router.push("/admin");
          else router.push("/dashboard");
        })
        .catch(() => router.push("/dashboard"));
    }
  }, [ready, authenticated, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white">
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src="/logo.jfif" alt="Borderless" className="w-9 h-9 rounded-xl object-cover" />
          <span className="text-xl font-bold tracking-tight">Borderless</span>
        </div>
        <Button onClick={login} variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800">
          Sign In
        </Button>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center pt-24 pb-16 px-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm mb-8">
          <Zap className="w-4 h-4" />
          Cross-border investing, simplified
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
          Invest Globally.
          <br />
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            Instantly.
          </span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Load USD from your local currency, browse tokenized real-world assets,
          and invest — all in one place. No complexity, no delays.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button onClick={login} size="lg" className="gap-2">
            Get Started <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 px-8 pb-24">
        {[
          {
            icon: Globe,
            title: "Global Access",
            desc: "Invest in US-based real-world assets from the UAE. Load funds in AED, see your balance in USD.",
          },
          {
            icon: Zap,
            title: "Instant Settlement",
            desc: "Your money moves in seconds, not days. Buy investment tokens instantly with a single click.",
          },
          {
            icon: Shield,
            title: "Secure & Simple",
            desc: "Bank-grade security with a consumer-friendly experience. No crypto knowledge required.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6"
          >
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-4">
              <f.icon className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
