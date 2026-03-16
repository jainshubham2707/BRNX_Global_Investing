"use client";

import { useAuth as usePrivy } from "@/lib/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatUsd, formatAed, usdToAed, usdToAedWithFee, USD_AED_RATE, FEE_BPS } from "@/lib/utils";
import { Minus, Plus, ShoppingCart, Zap, Building2, ArrowDown, Copy, CheckCircle, Upload, Clock, Loader2 } from "lucide-react";

interface Token {
  id: string;
  name: string;
  description: string;
  priceUsd: string;
  totalSupply: number;
  soldCount: number;
  imageUrl?: string;
  issuerName?: string;
}

// Demo tokens (fallback if DB is empty)
const DEMO_TOKENS: Token[] = [
  {
    id: "demo-1",
    name: "Manhattan Commercial Real Estate Fund",
    description: "Fractional ownership in a portfolio of Class-A commercial properties in Manhattan, NYC. Quarterly yield distributions.",
    priceUsd: "2.50",
    totalSupply: 100000000,
    soldCount: 0,
    issuerName: "Atlas Capital Partners",
  },
  {
    id: "demo-2",
    name: "US Treasury Bond Fund Token",
    description: "Tokenized exposure to short-duration US Treasury bonds. Low risk, stable returns, fully backed.",
    priceUsd: "1.00",
    totalSupply: 100000000,
    soldCount: 0,
    issuerName: "Atlas Capital Partners",
  },
];

type InstantPayStep = "select" | "bank_instructions" | "upload_receipt" | "processing" | "complete" | "error";

export default function MarketplacePage() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const [tokens, setTokens] = useState<Token[]>(DEMO_TOKENS);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseMode, setPurchaseMode] = useState<"wallet" | "instant">("wallet");
  const [success, setSuccess] = useState(false);

  // Instant pay multi-step state
  const [instantStep, setInstantStep] = useState<InstantPayStep>("select");
  const [instantPayId, setInstantPayId] = useState<string>("");
  const [bankReference, setBankReference] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingMsg, setProcessingMsg] = useState("");
  const [instantPayError, setInstantPayError] = useState("");

  useEffect(() => {
    if (ready && !authenticated) router.push("/");
  }, [ready, authenticated, router]);

  useEffect(() => {
    async function fetchTokens() {
      try {
        const res = await fetch("/api/tokens");
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) setTokens(data);
        }
      } catch {}
    }
    if (authenticated) fetchTokens();
  }, [authenticated]);

  if (!ready || !authenticated) return null;

  const tokenPrice = selectedToken ? parseFloat(selectedToken.priceUsd) : 0;
  const totalUsd = quantity * tokenPrice;
  const aedCalc = usdToAedWithFee(totalUsd);
  const totalAed = aedCalc.totalAed;
  const available = selectedToken ? selectedToken.totalSupply - selectedToken.soldCount : 0;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Wallet-based purchase (uses existing USD balance)
  const [purchaseError, setPurchaseError] = useState("");
  const handleWalletPurchase = async () => {
    if (!selectedToken) return;
    setPurchasing(true);
    setPurchaseError("");
    try {
      const res = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: selectedToken.id, quantity, mode: "wallet" }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setPurchaseError(data.error || "Purchase failed. Please try again.");
      }
    } catch {
      setPurchaseError("Network error. Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  // Step 1: Create instant pay request → get bank instructions
  const handleInstantPayStart = async () => {
    if (!selectedToken) return;
    setPurchasing(true);
    try {
      const res = await fetch("/api/instant-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: selectedToken.id, quantity }),
      });
      if (res.ok) {
        const data = await res.json();
        setInstantPayId(data.id);
        setBankReference(data.bankReference);
        setInstantStep("bank_instructions");
      }
    } finally {
      setPurchasing(false);
    }
  };

  // Step 3: Upload receipt, then auto-approve after processing delay
  const handleUploadReceipt = async () => {
    if (!transactionId && !receiptFile) return;
    setUploading(true);
    try {
      const res = await fetch("/api/instant-pay/upload-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: instantPayId,
          transactionId,
          receiptFilename: receiptFile?.name || null,
        }),
      });
      if (!res.ok) return;

      // Move to processing screen with staged messages
      setInstantStep("processing");
      setProcessingMsg("Verifying bank transfer receipt...");

      setTimeout(() => {
        setProcessingMsg("Bank transfer confirmed. Converting AED to USD...");

        setTimeout(() => {
          setProcessingMsg("Crediting USD to your wallet...");

          setTimeout(() => {
            setProcessingMsg("Purchasing tokens from Atlas Capital...");

            // Auto-approve: execute both TXs
            fetch("/api/auto-approve-instant-pay", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ requestId: instantPayId }),
            })
              .then(async (approveRes) => {
                if (approveRes.ok) {
                  setProcessingMsg("Tokens issued to your portfolio!");
                  setTimeout(() => setInstantStep("complete"), 800);
                } else {
                  const data = await approveRes.json();
                  setInstantPayError(data.error || "Failed to process payment");
                  setInstantStep("error");
                }
              })
              .catch(() => {
                setInstantPayError("Network error — please try again");
                setInstantStep("error");
              });
          }, 2000);
        }, 2000);
      }, 2000);
    } finally {
      setUploading(false);
    }
  };

  const resetAll = () => {
    setSuccess(false);
    setSelectedToken(null);
    setQuantity(1);
    setPurchaseMode("wallet");
    setInstantStep("select");
    setInstantPayId("");
    setBankReference("");
    setTransactionId("");
    setReceiptFile(null);
  };

  // ── Success Screen ──────────────────────────────────────────────────
  if (success) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Purchase Complete!</h1>
          <p className="text-slate-500 mb-2">
            You now own <strong>{quantity}</strong> {selectedToken?.name} token{quantity > 1 ? "s" : ""}.
          </p>
          <p className="text-sm text-slate-400 mb-8">
            {formatUsd(totalUsd)} has been deducted from your USD balance.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.push("/portfolio")}>View Portfolio</Button>
            <Button variant="outline" onClick={resetAll}>Buy More</Button>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Instant Pay: Processing Screen ──────────────────────────────────
  if (instantStep === "processing") {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto text-center py-16">
          <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Processing Your Payment</h1>
          <p className="text-slate-500 mb-4">{processingMsg}</p>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-400 bg-slate-50 px-5 py-2.5 rounded-full mx-auto w-fit">
            <span>{formatAed(totalAed)}</span>
            <ArrowDown className="w-3 h-3 rotate-[-90deg]" />
            <span>{quantity} {selectedToken?.name} token{quantity > 1 ? "s" : ""}</span>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Reference: <code className="bg-slate-100 px-2 py-0.5 rounded">{bankReference}</code>
          </p>
        </div>
      </AppShell>
    );
  }

  // ── Instant Pay: Complete Screen ──────────────────────────────────
  if (instantStep === "complete") {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Purchase Complete!</h1>
          <p className="text-slate-500 mb-2">
            You now own <strong>{quantity}</strong> {selectedToken?.name} token{quantity > 1 ? "s" : ""}.
          </p>
          <p className="text-sm text-slate-400 mb-8">
            {formatAed(totalAed)} was converted and {formatUsd(totalUsd)} paid to Atlas Capital.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.push("/portfolio")}>View Portfolio</Button>
            <Button variant="outline" onClick={resetAll}>Buy More</Button>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Instant Pay: Error Screen ─────────────────────────────────────
  if (instantStep === "error") {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Something Went Wrong</h1>
          <p className="text-red-500 mb-8">{instantPayError}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={resetAll}>Try Again</Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>Dashboard</Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marketplace</h1>
          <p className="text-slate-500 mt-1">Browse and invest in tokenized real-world assets</p>
        </div>

        {!selectedToken ? (
          /* ── Token Grid ──────────────────────────────────────────── */
          <div className="grid md:grid-cols-2 gap-6">
            {tokens.map((token) => (
              <Card key={token.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedToken(token)}>
                <div className="h-32 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                  <Building2 className="w-12 h-12 text-slate-600" />
                </div>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900 text-lg leading-tight">{token.name}</h3>
                    <Badge variant="info">{formatUsd(parseFloat(token.priceUsd))}/token</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{token.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      <span className="text-slate-600 font-medium">{token.soldCount.toLocaleString()}</span> / {token.totalSupply.toLocaleString()} sold
                    </div>
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(token.soldCount / token.totalSupply) * 100}%` }} />
                    </div>
                  </div>
                  {token.issuerName && <p className="text-xs text-slate-400 mt-3">Issued by {token.issuerName}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : instantStep === "bank_instructions" ? (
          /* ── Instant Pay Step 2: Bank Transfer Instructions ──────── */
          <div className="max-w-xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Instant Pay — Wire Transfer</h2>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Transfer <strong>{formatAed(totalAed)}</strong> to purchase {quantity} {selectedToken.name} token{quantity > 1 ? "s" : ""}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">{quantity} x {formatUsd(tokenPrice)}</span>
                    <span className="font-semibold text-slate-900">{formatUsd(totalUsd)}</span>
                  </div>
                  <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-slate-400" /></div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">You send</span>
                    <span className="font-semibold text-indigo-600 text-lg">{formatAed(totalAed)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between text-xs text-slate-400">
                    <span>Rate</span><span>1 AED = {(1 / USD_AED_RATE).toFixed(4)} USD</span>
                  </div>
                </div>

                {/* Bank Details */}
                {[
                  { label: "Bank Name", value: "Emirates NBD" },
                  { label: "Account Name", value: "Borderless FZE" },
                  { label: "IBAN", value: "AE12 0340 0000 1234 5678 901" },
                  { label: "SWIFT / BIC", value: "EABORAEADXB" },
                  { label: "Amount", value: `AED ${totalAed.toFixed(2)}` },
                  { label: "Reference", value: bankReference },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-xs text-slate-400">{item.label}</p>
                      <p className="text-sm font-medium text-slate-900">{item.value}</p>
                    </div>
                    <button onClick={() => handleCopy(item.value)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                      {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}

                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className="text-sm text-indigo-800 font-medium">Important</p>
                  <p className="text-xs text-indigo-600 mt-1">
                    Include the reference code <strong>{bankReference}</strong> in your bank transfer. After transferring, upload your receipt on the next step.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setInstantStep("select")}>Back</Button>
                  <Button className="flex-1" onClick={() => setInstantStep("upload_receipt")}>
                    I&apos;ve Sent the Money
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : instantStep === "upload_receipt" ? (
          /* ── Instant Pay Step 3: Upload Receipt ──────────────────── */
          <div className="max-w-xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Upload Payment Proof</h2>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Provide your bank transaction ID or upload a receipt
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="bg-slate-50 rounded-xl p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount sent</span>
                    <span className="font-semibold">{formatAed(totalAed)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-500">Reference</span>
                    <code className="text-xs bg-white px-2 py-0.5 rounded">{bankReference}</code>
                  </div>
                </div>

                <Input
                  id="txId"
                  label="Bank Transaction ID / Reference Number"
                  placeholder="e.g. TXN-2026031600123"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Bank Receipt (optional)
                  </label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-300 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      id="receipt-upload"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    />
                    <label htmlFor="receipt-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      {receiptFile ? (
                        <p className="text-sm text-indigo-600 font-medium">{receiptFile.name}</p>
                      ) : (
                        <>
                          <p className="text-sm text-slate-600 font-medium">Click to upload receipt</p>
                          <p className="text-xs text-slate-400 mt-1">PNG, JPG or PDF</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setInstantStep("bank_instructions")}>Back</Button>
                  <Button
                    className="flex-1"
                    size="lg"
                    loading={uploading}
                    disabled={!transactionId && !receiptFile}
                    onClick={handleUploadReceipt}
                  >
                    Submit for Verification
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* ── Token Detail + Purchase Panel ───────────────────────── */
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3 space-y-6">
              <Card>
                <div className="h-48 bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-2xl flex items-center justify-center">
                  <Building2 className="w-16 h-16 text-slate-600" />
                </div>
                <CardContent className="pt-5">
                  <h2 className="text-xl font-bold text-slate-900 mb-2">{selectedToken.name}</h2>
                  <p className="text-slate-500 mb-4">{selectedToken.description}</p>
                  <div className="grid grid-cols-3 gap-4 text-center py-4 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-xs text-slate-400">Price</p>
                      <p className="font-semibold text-slate-900">{formatUsd(parseFloat(selectedToken.priceUsd))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Available</p>
                      <p className="font-semibold text-slate-900">{available.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Issuer</p>
                      <p className="font-semibold text-slate-900 text-xs">{selectedToken.issuerName}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2 space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-5">
                  <h3 className="font-semibold text-slate-900">Buy Tokens</h3>

                  {/* Quantity */}
                  <div>
                    <label className="text-sm text-slate-500 mb-2 block">Quantity</label>
                    <div className="flex items-center gap-3">
                      <button className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-2xl font-bold text-slate-900 w-16 text-center">{quantity}</span>
                      <button className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50" onClick={() => setQuantity(Math.min(available, quantity + 1))}>
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">{quantity} x {formatUsd(tokenPrice)}</span>
                      <span className="font-semibold text-slate-900">{formatUsd(totalUsd)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Rate: 1 USD = {USD_AED_RATE} AED</span>
                      <span>{formatAed(aedCalc.baseAed)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Transaction fee ({FEE_BPS}bps)</span>
                      <span>+{formatAed(aedCalc.fee)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-1.5 border-t border-slate-200">
                      <span className="font-medium text-slate-700">Total in AED</span>
                      <span className="font-semibold text-indigo-600">{formatAed(totalAed)}</span>
                    </div>
                  </div>

                  {/* Purchase Mode Tabs */}
                  <div className="flex bg-slate-100 rounded-xl p-1">
                    <button
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${purchaseMode === "wallet" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
                      onClick={() => setPurchaseMode("wallet")}
                    >
                      Use Balance
                    </button>
                    <button
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${purchaseMode === "instant" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
                      onClick={() => setPurchaseMode("instant")}
                    >
                      <span className="flex items-center justify-center gap-1">
                        <Zap className="w-3 h-3" /> Instant Pay
                      </span>
                    </button>
                  </div>

                  {purchaseError && (
                    <div className="bg-red-50 text-red-700 text-sm px-4 py-2.5 rounded-xl">{purchaseError}</div>
                  )}

                  {purchaseMode === "wallet" ? (
                    <Button className="w-full" size="lg" loading={purchasing} onClick={handleWalletPurchase}>
                      Buy for {formatUsd(totalUsd)}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <Button
                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
                        size="lg"
                        loading={purchasing}
                        onClick={handleInstantPayStart}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Pay {formatAed(totalAed)} via Bank Transfer
                      </Button>
                      <p className="text-xs text-slate-400 text-center">
                        Wire AED → we handle the rest. Tokens issued once payment is confirmed.
                      </p>
                    </div>
                  )}

                  <button className="text-sm text-slate-400 hover:text-slate-600 w-full text-center" onClick={resetAll}>
                    Back to marketplace
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
