"use client";

import { useAuth as usePrivy } from "@/lib/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatUsd, formatAed, aedToUsdNet, USD_AED_RATE, FEE_BPS } from "@/lib/utils";
import { ArrowDown, Copy, CheckCircle, Loader2 } from "lucide-react";

type Step = "input" | "instructions" | "processing" | "complete" | "error";

export default function AddFundsPage() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const [aedAmount, setAedAmount] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [copied, setCopied] = useState(false);
  const [processingMsg, setProcessingMsg] = useState("");
  const [creditResult, setCreditResult] = useState<{ usdCredited: number; txHash: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (ready && !authenticated) router.push("/");
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) return null;

  const aedNum = aedAmount ? parseFloat(aedAmount) : 0;
  const conv = aedToUsdNet(aedNum);
  const usdEquivalent = conv.netUsd;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmSent = () => {
    setStep("processing");
    setProcessingMsg("Detecting bank transfer...");

    // Simulate processing stages with 3-4 second total delay
    timerRef.current = setTimeout(() => {
      setProcessingMsg("Bank transfer received. Converting AED to USD...");

      timerRef.current = setTimeout(() => {
        setProcessingMsg("Crediting USD to your wallet...");

        // Actually call the auto-onramp API
        fetch("/api/auto-onramp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aedAmount: aedNum }),
        })
          .then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              setCreditResult({ usdCredited: data.usdCredited, txHash: data.txHash });
              setStep("complete");
            } else {
              const data = await res.json();
              setErrorMsg(data.error || "Failed to credit balance");
              setStep("error");
            }
          })
          .catch(() => {
            setErrorMsg("Network error — please try again");
            setStep("error");
          });
      }, 1500);
    }, 1500);
  };

  return (
    <AppShell>
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Funds</h1>
          <p className="text-slate-500 mt-1">Load USD into your account via AED bank transfer</p>
        </div>

        {step === "input" && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Enter Amount</h2>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Input
                  id="aed"
                  label="Amount in AED"
                  type="number"
                  placeholder="e.g. 5000"
                  value={aedAmount}
                  onChange={(e) => setAedAmount(e.target.value)}
                  min="10"
                />
              </div>

              {aedNum > 0 && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">You send</span>
                    <span className="font-medium text-slate-900">{formatAed(aedNum)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Transaction fee ({FEE_BPS}bps)</span>
                    <span>-{formatAed(conv.fee)}</span>
                  </div>
                  <div className="flex justify-center">
                    <ArrowDown className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">You receive (USD)</span>
                    <span className="font-semibold text-emerald-600 text-lg">{formatUsd(usdEquivalent)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Exchange rate</span>
                      <span>1 USD = {USD_AED_RATE} AED</span>
                    </div>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={!aedAmount || parseFloat(aedAmount) < 10}
                onClick={() => setStep("instructions")}
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "instructions" && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Bank Transfer Instructions</h2>
              <p className="text-sm text-slate-500 mt-1">Transfer {formatAed(parseFloat(aedAmount))} to the following account</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Bank Name", value: "Emirates NBD" },
                { label: "Account Name", value: "Borderless FZE" },
                { label: "IBAN", value: "AE12 0340 0000 1234 5678 901" },
                { label: "SWIFT / BIC", value: "EABORAEADXB" },
                { label: "Reference", value: `BL-${Date.now().toString(36).toUpperCase()}` },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-xs text-slate-400">{item.label}</p>
                    <p className="text-sm font-medium text-slate-900">{item.value}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(item.value)}
                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ))}

              <div className="bg-indigo-50 rounded-xl p-4 mt-4">
                <p className="text-sm text-indigo-800 font-medium">Important</p>
                <p className="text-xs text-indigo-600 mt-1">
                  Include the reference code in your bank transfer. Your USD balance will be updated once the transfer is confirmed.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("input")}>
                  Back
                </Button>
                <Button className="flex-1" onClick={handleConfirmSent}>
                  I&apos;ve Sent the Money
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "processing" && (
          <Card>
            <CardContent className="py-16 text-center">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-6" />
              <h2 className="text-lg font-semibold text-slate-900">Processing Transfer</h2>
              <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">{processingMsg}</p>
              <div className="mt-6 flex justify-center">
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-4 py-2 rounded-full">
                  <span>{formatAed(aedNum)}</span>
                  <ArrowDown className="w-3 h-3 rotate-[-90deg]" />
                  <span>{formatUsd(usdEquivalent)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "complete" && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="py-10 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-lg font-semibold text-emerald-800">Funds Added Successfully</h2>
              <p className="text-sm text-emerald-600 mt-2">
                <strong>{formatUsd(creditResult?.usdCredited || 0)}</strong> has been credited to your account.
              </p>
              <p className="text-xs text-emerald-500 mt-1">
                You sent {formatAed(aedNum)} (fee: {formatAed(conv.fee)})
              </p>
              {creditResult?.txHash && (
                <a
                  href={`${process.env.NEXT_PUBLIC_EXPLORER_URL || "https://sepolia.basescan.org"}/tx/${creditResult.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mt-3"
                >
                  View on BaseScan
                </a>
              )}
              <div className="flex gap-3 justify-center mt-6">
                <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
                <Button variant="outline" onClick={() => router.push("/marketplace")}>Go to Marketplace</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "error" && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-10 text-center">
              <h2 className="text-lg font-semibold text-red-800">Something Went Wrong</h2>
              <p className="text-sm text-red-600 mt-2">{errorMsg}</p>
              <div className="flex gap-3 justify-center mt-6">
                <Button onClick={() => setStep("instructions")}>Try Again</Button>
                <Button variant="outline" onClick={() => router.push("/dashboard")}>Dashboard</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
