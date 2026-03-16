"use client";

import { useAuth as usePrivy } from "@/lib/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, XCircle, Clock } from "lucide-react";

export default function KYCPage() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", dob: "", nationality: "" });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [kycStatus, setKycStatus] = useState<string>("none");

  useEffect(() => {
    if (ready && !authenticated) router.push("/");
  }, [ready, authenticated, router]);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/user/me");
        if (res.ok) {
          const data = await res.json();
          setKycStatus(data.kycStatus || "none");
        }
      } catch {}
    }
    if (authenticated) checkStatus();
  }, [authenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/user/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          dob: form.dob,
          nationality: form.nationality,
          documentName: file?.name || "document.pdf",
        }),
      });
      if (res.ok) {
        setKycStatus("pending");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready || !authenticated) return null;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Identity Verification</h1>
          <p className="text-slate-500 mt-1">Verify your identity to start investing</p>
        </div>

        {kycStatus === "approved" && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="py-8 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-emerald-800">Verified</h2>
              <p className="text-sm text-emerald-600 mt-1">Your identity has been verified. You can now invest.</p>
              <Button onClick={() => router.push("/dashboard")} className="mt-4" size="sm">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {kycStatus === "pending" && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-8 text-center">
              <Clock className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-amber-800">Under Review</h2>
              <p className="text-sm text-amber-600 mt-1">
                Your documents are being reviewed. This usually takes a few minutes.
              </p>
            </CardContent>
          </Card>
        )}

        {kycStatus === "rejected" && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-6">
              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-red-500 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-red-800">Verification Failed</h2>
                  <p className="text-sm text-red-600 mt-1">Please resubmit your documents below.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {(kycStatus === "none" || kycStatus === "rejected") && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Personal Information</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  id="fullName"
                  label="Full Name (as on ID)"
                  placeholder="e.g. Ahmed Al Maktoum"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
                <Input
                  id="dob"
                  label="Date of Birth"
                  type="date"
                  required
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                />
                <Input
                  id="nationality"
                  label="Nationality"
                  placeholder="e.g. UAE"
                  required
                  value={form.nationality}
                  onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                />

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Emirates ID / Passport
                  </label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-300 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      id="doc-upload"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <label htmlFor="doc-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      {file ? (
                        <p className="text-sm text-indigo-600 font-medium">{file.name}</p>
                      ) : (
                        <>
                          <p className="text-sm text-slate-600 font-medium">Click to upload</p>
                          <p className="text-xs text-slate-400 mt-1">PNG, JPG or PDF up to 10MB</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <Button type="submit" loading={submitting} className="w-full" size="lg">
                  Submit for Verification
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
