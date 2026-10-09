"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { supabase } from "@/src/lib/supabase";

type ListingType = "item" | "room" | "service" | "place" | "lost" | "found";
type FilterType = "all" | ListingType;

type Listing = {
  id: string;
  type: ListingType;
  category: string | null;
  title: string;
  description: string | null;
  price: number | null;
  images: string[] | null;
  location: string | null;
  created_at: string;
  profiles: { full_name: string | null }[] | null;
};

const filters: { id: FilterType; label: string; icon: string }[] = [
  { id: "all", label: "Everything", icon: "✦" },
  { id: "item", label: "Market", icon: "🛍️" },
  { id: "room", label: "Rooms", icon: "🏠" },
  { id: "service", label: "Services", icon: "🧰" },
  { id: "place", label: "Places", icon: "📍" },
  { id: "lost", label: "Lost", icon: "🔎" },
  { id: "found", label: "Found", icon: "🤝" },
];

function formatPrice(price: number | null) {
  if (price === null) return null;
  return `KSh ${new Intl.NumberFormat("en-KE").format(price)}`;
}

function timeAgo(date: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadListings() {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from("listings")
        .select(
          "id, type, category, title, description, price, images, location, created_at, profiles(full_name)",
        )
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(50);

      if (queryError) {
        setError("We couldn’t load listings right now. Please try again.");
      } else {
        setListings((data ?? []) as Listing[]);
      }
      setLoading(false);
    }

    void loadListings();
  }, []);

  const visibleListings = useMemo(() => {
    const term = search.trim().toLowerCase();
    return listings.filter((listing) => {
      const matchesType = activeFilter === "all" || listing.type === activeFilter;
      const searchable = [listing.title, listing.description, listing.category, listing.location]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesType && (!term || searchable.includes(term));
    });
  }, [activeFilter, listings, search]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl bg-[#f8faf9] pb-24 text-slate-900">
      <section className="mx-auto max-w-6xl px-5 pb-4 pt-9 sm:px-8 sm:pt-14">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
            Your campus marketplace
          </p>
          <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Find it at Maseno.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">
            Discover what students are selling, sharing, offering, and looking for around campus.
          </p>
        </div>

        <div className="mt-7 flex max-w-2xl items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10">
          <span className="text-xl text-slate-400" aria-hidden="true">⌕</span>
          <label htmlFor="listing-search" className="sr-only">Search listings</label>
          <input
            id="listing-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search phones, rooms, laundry..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs font-semibold text-slate-400 hover:text-slate-700"
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-8" aria-label="Listing categories">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                activeFilter === filter.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              <span aria-hidden="true">{filter.icon}</span>
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-8 sm:px-8">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {activeFilter === "all"
                ? "Fresh on campus"
                : `${filters.find((filter) => filter.id === activeFilter)?.label} listings`}
            </h2>
            {!loading && <p className="mt-1 text-sm text-slate-500">{visibleListings.length} results</p>}
          </div>
          <button className="hidden text-sm font-semibold text-emerald-700 sm:block">Newest first</button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <p className="font-semibold">{error}</p>
            <p className="mt-1 text-red-600">Check your connection and refresh the page.</p>
          </div>
        )}

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((skeleton) => (
              <div key={skeleton} className="h-72 animate-pulse rounded-2xl bg-slate-200/70" />
            ))}
          </div>
        )}

        {!loading && !error && visibleListings.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-xl">✦</div>
            <h3 className="mt-4 font-bold">Nothing here yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
              Try another search or category. New campus listings will show up here.
            </p>
          </div>
        )}

        {!loading && !error && visibleListings.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleListings.map((listing) => (
              <article key={listing.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative aspect-[1.55] overflow-hidden bg-emerald-50">
                  {listing.images?.[0] ? (
                    <Image
                      src={listing.images[0]}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid size-full place-items-center bg-gradient-to-br from-emerald-100 to-teal-50 text-4xl">
                      {filters.find((filter) => filter.id === listing.type)?.icon}
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700 backdrop-blur">
                    {listing.type}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold leading-5">{listing.title}</h3>
                    {listing.price !== null && (
                      <p className="shrink-0 text-sm font-bold text-emerald-700">{formatPrice(listing.price)}</p>
                    )}
                  </div>
                  {listing.description && <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">{listing.description}</p>}
                  <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-400">
                    <span className="truncate">{listing.location ?? "Maseno campus"}</span>
                    <span className="shrink-0">{timeAgo(listing.created_at)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

    </main>
  );
}
