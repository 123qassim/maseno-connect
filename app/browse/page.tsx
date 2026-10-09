"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/lib/useAuth";
import { supabase } from "@/src/lib/supabase";

const types = ["all", "item", "room", "service", "place", "lost", "found"] as const;
type ListingType = (typeof types)[number];

type Listing = {
  id: string;
  type: Exclude<ListingType, "all">;
  category: string | null;
  title: string;
  description: string | null;
  price: number | null;
  images: string[] | null;
  location: string | null;
};

export default function BrowsePage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [type, setType] = useState<ListingType>("all");
  const [category, setCategory] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [showWatchForm, setShowWatchForm] = useState(false);
  const [watchType, setWatchType] = useState<ListingType>("all");
  const [watchCategory, setWatchCategory] = useState("");
  const [watchKeywords, setWatchKeywords] = useState("");
  const [watchMaxPrice, setWatchMaxPrice] = useState("");
  const [watchMessage, setWatchMessage] = useState<string | null>(null);
  const [savingWatch, setSavingWatch] = useState(false);

  useEffect(() => {
    async function loadListings() {
      const { data, error: queryError } = await supabase
        .from("listings")
        .select("id, type, category, title, description, price, images, location")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (queryError) setError("We couldn’t load listings. Please try again.");
      else setListings((data ?? []) as Listing[]);
      setLoading(false);
    }
    void loadListings();
  }, []);

  const filteredListings = useMemo(() => {
    const term = search.trim().toLowerCase();
    const categoryTerm = category.trim().toLowerCase();
    const maximum = maxPrice ? Number(maxPrice) : null;

    return listings.filter((listing) => {
      const matchesType = type === "all" || listing.type === type;
      const matchesCategory = !categoryTerm || listing.category?.toLowerCase().includes(categoryTerm);
      const matchesPrice = maximum === null || (listing.price !== null && listing.price <= maximum);
      const matchesSearch = !term || `${listing.title} ${listing.description ?? ""}`.toLowerCase().includes(term);
      return matchesType && matchesCategory && matchesPrice && matchesSearch;
    });
  }, [category, listings, maxPrice, search, type]);

  return (
    <main className="min-h-screen bg-[#f8faf9] px-5 pb-28 pt-8 text-slate-900">
      <section className="mx-auto max-w-6xl">
        <div className="mb-7">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Campus listings</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Browse everything</h1>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-semibold text-slate-700">
              Search
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or description" className={inputClass} />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Type
              <select value={type} onChange={(event) => setType(event.target.value as ListingType)} className={inputClass}>
                {types.map((listingType) => <option key={listingType} value={listingType}>{listingType === "all" ? "All types" : listingType[0].toUpperCase() + listingType.slice(1)}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Category
              <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="e.g. Electronics" className={inputClass} />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Max price (KSh)
              <input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Any price" className={inputClass} />
            </label>
          </div>
        </div>

        <div className="mb-4 mt-8 flex items-center justify-between">
          <h2 className="text-lg font-bold">{loading ? "Loading listings..." : `${filteredListings.length} listing${filteredListings.length === 1 ? "" : "s"}`}</h2>
          <div className="flex items-center gap-3">
            <button onClick={() => { setWatchType(type); setWatchCategory(category); setWatchKeywords(search); setWatchMaxPrice(maxPrice); setShowWatchForm((current) => !current); setWatchMessage(null); }} className="text-sm font-semibold text-emerald-700">{showWatchForm ? "Close" : "Notify me"}</button>
            {(search || category || maxPrice || type !== "all") && <button onClick={() => { setSearch(""); setCategory(""); setMaxPrice(""); setType("all"); }} className="hidden text-sm font-semibold text-slate-500 sm:block">Clear filters</button>}
          </div>
        </div>

        {showWatchForm && (
          <form onSubmit={async (event) => {
            event.preventDefault();
            if (!user) { router.push("/signin"); return; }
            setSavingWatch(true);
            setWatchMessage(null);
            const { error: watchError } = await supabase.from("watches").insert({
              user_id: user.id,
              type: watchType === "all" ? null : watchType,
              category: watchCategory.trim() || null,
              keywords: watchKeywords.trim() || null,
              max_price: watchMaxPrice ? Number(watchMaxPrice) : null,
            });
            setSavingWatch(false);
            setWatchMessage(watchError ? watchError.message : "Watch saved. We’ll notify you about matching listings.");
            if (!watchError) { setWatchKeywords(""); setShowWatchForm(false); }
          }} className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select value={watchType} onChange={(event) => setWatchType(event.target.value as ListingType)} className={inputClass} aria-label="Watch type">
                {types.map((listingType) => <option key={listingType} value={listingType}>{listingType === "all" ? "Any type" : listingType}</option>)}
              </select>
              <input value={watchCategory} onChange={(event) => setWatchCategory(event.target.value)} placeholder="Category (optional)" className={inputClass} />
              <input value={watchKeywords} onChange={(event) => setWatchKeywords(event.target.value)} placeholder="Keywords (optional)" className={inputClass} />
              <input type="number" min="0" value={watchMaxPrice} onChange={(event) => setWatchMaxPrice(event.target.value)} placeholder="Max price (optional)" className={inputClass} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-600">{watchMessage ?? "We’ll match type, category, keywords, and price."}</p>
              <button disabled={savingWatch} className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{savingWatch ? "Saving..." : "Save watch"}</button>
            </div>
          </form>
        )}
        {watchMessage && !showWatchForm && <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{watchMessage}</p>}
        {error && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {loading && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl bg-slate-200/70" />)}</div>}
        {!loading && !error && filteredListings.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No listings match those filters.</div>}
        {!loading && !error && filteredListings.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((listing) => (
              <Link key={listing.id} href={`/listing/${listing.id}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative aspect-[1.55] overflow-hidden bg-emerald-50">
                  {listing.images?.[0] ? <Image src={listing.images[0]} alt="" fill unoptimized className="object-cover transition duration-300 group-hover:scale-105" /> : <div className="grid size-full place-items-center text-4xl">✦</div>}
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">{listing.type}</span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold leading-5">{listing.title}</h3>
                    {listing.price !== null && <span className="shrink-0 text-sm font-bold text-emerald-700">KSh {new Intl.NumberFormat("en-KE").format(listing.price)}</span>}
                  </div>
                  <p className="mt-3 text-sm text-slate-500">{listing.location ?? "Maseno campus"}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";
