"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import {
  LayoutDashboard,
  Store,
  Briefcase,
  PlusCircle,
  ShieldCheck,
  Building2,
  LogOut,
  UserCheck,
  Landmark,
} from "lucide-react";
import { useAuth as usePrivy } from "@/lib/hooks";

const buyerNav = [
  { label: "Dashboard", href: ROUTES.dashboard, icon: LayoutDashboard },
  { label: "Marketplace", href: ROUTES.marketplace, icon: Store },
  { label: "Portfolio", href: ROUTES.portfolio, icon: Briefcase },
  { label: "Add Funds", href: ROUTES.addFunds, icon: PlusCircle },
  { label: "KYC", href: "/kyc", icon: UserCheck },
  { label: "Beneficiaries", href: "/beneficiaries", icon: Landmark },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = usePrivy();

  const email = user?.email?.address || "";
  const ADMIN_EMAILS = ["shubham@borderless.world"];
  const ISSUER_EMAILS = ["shubham@mvplabs.build"];
  const isAdmin = ADMIN_EMAILS.includes(email);
  const isIssuer = ISSUER_EMAILS.includes(email);

  const navItems = isAdmin
    ? [{ label: "Admin Panel", href: ROUTES.admin, icon: ShieldCheck }]
    : isIssuer
      ? [
          { label: "Issuer Portal", href: "/issuer", icon: Building2 },
        ]
      : buyerNav;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-slate-900 text-white flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-700/50">
        <Link href={ROUTES.dashboard} className="flex items-center gap-3">
          <img src="/logo.jfif" alt="Borderless" className="w-9 h-9 rounded-xl object-cover" />
          <div>
            <span className="text-lg font-bold tracking-tight">Borderless</span>
            <p className="text-[10px] text-slate-400 -mt-0.5 tracking-wider uppercase">
              Global Investing
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-indigo-600/20 text-indigo-300"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="px-3 py-4 border-t border-slate-700/50">
        <div className="px-3 py-2 text-xs text-slate-500 truncate">
          {user?.email?.address || "User"}
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
