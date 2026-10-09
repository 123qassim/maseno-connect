"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/lib/useAuth";

const navigation = [
  { label: "Home", href: "/", icon: "⌂" },
  { label: "Search", href: "/browse", icon: "⌕" },
  { label: "Post", href: "/post", icon: "＋" },
  { label: "Alerts", href: "/alerts", icon: "♡" },
  { label: "Profile", href: "/dashboard#profile", icon: "♙" },
];

export default function AppNavigation() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const fullName = user?.user_metadata?.full_name as string | undefined;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName = fullName || user?.email?.split("@")[0] || "Account";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-600 text-sm font-black text-white">M</span>
          <span className="text-base font-black tracking-tight text-slate-900">Maseno Connect</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                pathname === item.href.split("#")[0] && item.label === "Home"
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {loading ? (
          <span className="size-9 animate-pulse rounded-full bg-slate-100" aria-label="Loading account" />
        ) : user ? (
          <Link href="/dashboard#profile" className="flex items-center gap-2 rounded-full pl-2 text-right">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" width={36} height={36} unoptimized className="size-9 rounded-full object-cover" />
            ) : (
              <span className="grid size-9 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{initials}</span>
            )}
            <span className="hidden max-w-28 truncate text-sm font-semibold text-slate-700 sm:block">{displayName}</span>
          </Link>
        ) : (
          <Link href="/signin" className="rounded-full border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-600 hover:text-emerald-700">
            Sign in
          </Link>
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-2.5 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur md:hidden" aria-label="Mobile navigation">
        <div className="mx-auto flex max-w-md items-center justify-around">
          {navigation.map((item) => {
            const isActive = item.label === "Home" ? pathname === "/" : pathname === "/dashboard";
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[11px] font-semibold ${
                  isActive ? "text-emerald-700" : "text-slate-400"
                }`}
              >
                <span className="text-xl leading-5" aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
