"use client";

import { useAuth as usePrivy } from "@/lib/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Landmark,
  Plus,
  Trash2,
  CheckCircle,
  Building2,
  Copy,
  Star,
} from "lucide-react";

interface Beneficiary {
  id: string;
  name: string;
  bankName: string;
  accountName: string;
  iban: string;
  swift: string;
  currency: string;
  isDefault: boolean;
}

const DEFAULT_BENEFICIARY: Beneficiary = {
  id: "borderless-default",
  name: "Borderless FZE (On-Ramp)",
  bankName: "Emirates NBD",
  accountName: "Borderless FZE",
  iban: "AE12 0340 0000 1234 5678 901",
  swift: "EABORAEADXB",
  currency: "AED",
  isDefault: true,
};

export default function BeneficiariesPage() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([DEFAULT_BENEFICIARY]);
  const [showForm, setShowForm] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    bankName: "",
    accountName: "",
    iban: "",
    swift: "",
    currency: "AED",
  });

  useEffect(() => {
    if (ready && !authenticated) router.push("/");
  }, [ready, authenticated, router]);

  // Load saved beneficiaries from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("beneficiaries");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure default is always present
        const hasDefault = parsed.some((b: Beneficiary) => b.id === "borderless-default");
        setBeneficiaries(hasDefault ? parsed : [DEFAULT_BENEFICIARY, ...parsed]);
      } catch {
        setBeneficiaries([DEFAULT_BENEFICIARY]);
      }
    }
  }, []);

  const saveBeneficiaries = (list: Beneficiary[]) => {
    setBeneficiaries(list);
    localStorage.setItem("beneficiaries", JSON.stringify(list));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const newBen: Beneficiary = {
      id: `ben-${Date.now()}`,
      ...form,
      isDefault: false,
    };
    saveBeneficiaries([...beneficiaries, newBen]);
    setForm({ name: "", bankName: "", accountName: "", iban: "", swift: "", currency: "AED" });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (id === "borderless-default") return;
    saveBeneficiaries(beneficiaries.filter((b) => b.id !== id));
  };

  const copyField = (value: string, fieldId: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!ready || !authenticated) return null;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Beneficiaries</h1>
            <p className="text-slate-500 mt-1">Manage your bank transfer beneficiaries for on-ramp</p>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Beneficiary
            </Button>
          )}
        </div>

        {/* Add Beneficiary Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Add New Beneficiary</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <Input
                  id="ben-name"
                  label="Beneficiary Label"
                  placeholder="e.g. My UAE Bank Account"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    id="ben-bank"
                    label="Bank Name"
                    placeholder="e.g. Emirates NBD"
                    required
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  />
                  <Input
                    id="ben-account"
                    label="Account Name"
                    placeholder="e.g. John Doe"
                    required
                    value={form.accountName}
                    onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                  />
                </div>
                <Input
                  id="ben-iban"
                  label="IBAN"
                  placeholder="e.g. AE12 0340 0000 1234 5678 901"
                  required
                  value={form.iban}
                  onChange={(e) => setForm({ ...form, iban: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    id="ben-swift"
                    label="SWIFT / BIC"
                    placeholder="e.g. EABORAEADXB"
                    required
                    value={form.swift}
                    onChange={(e) => setForm({ ...form, swift: e.target.value })}
                  />
                  <Input
                    id="ben-currency"
                    label="Currency"
                    placeholder="AED"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Save Beneficiary
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Beneficiary List */}
        <div className="space-y-4">
          {beneficiaries.map((ben) => (
            <Card key={ben.id} className={ben.isDefault ? "border-indigo-200 bg-indigo-50/30" : ""}>
              <CardContent className="py-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      ben.isDefault ? "bg-indigo-100" : "bg-slate-100"
                    }`}>
                      {ben.isDefault ? (
                        <Star className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <Building2 className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{ben.name}</h3>
                        {ben.isDefault && <Badge variant="info">Default</Badge>}
                      </div>
                      <p className="text-xs text-slate-400">{ben.currency} account</p>
                    </div>
                  </div>
                  {!ben.isDefault && (
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(ben.id)}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Bank Name", value: ben.bankName, key: `${ben.id}-bank` },
                    { label: "Account Name", value: ben.accountName, key: `${ben.id}-acct` },
                    { label: "IBAN", value: ben.iban, key: `${ben.id}-iban` },
                    { label: "SWIFT / BIC", value: ben.swift, key: `${ben.id}-swift` },
                  ].map((field) => (
                    <div key={field.key} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{field.label}</p>
                        <p className="text-sm font-medium text-slate-900">{field.value}</p>
                      </div>
                      <button
                        onClick={() => copyField(field.value, field.key)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {copiedField === field.key ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
