"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/lib/useAuth";
import { supabase } from "@/src/lib/supabase";

type Listing = {
  id: string;
  owner_id: string;
  type: string;
  category: string | null;
  title: string;
  description: string | null;
  price: number | null;
  images: string[] | null;
  location: string | null;
  status: string;
  profiles: { phone: string | null; full_name: string | null }[] | null;
};
type Match = {
  lost_listing_id: string;
  confidence: number;
  reason: string;
  listing?: { id: string; title: string; description: string | null; location: string | null };
};

export default function ListingPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#f8faf9] text-sm text-slate-500">Loading listing...</main>}><ListingContent /></Suspense>;
}

function ListingContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const matches = useMemo(() => {
    const rawMatches = searchParams.get("matches");
    if (!rawMatches) return [];
    try {
      const parsed: unknown = JSON.parse(rawMatches);
      return Array.isArray(parsed) ? parsed as Match[] : [];
    } catch {
      return [];
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadListing() {
      const { data, error: queryError } = await supabase.from("listings").select("id, owner_id, type, category, title, description, price, images, location, status, profiles(phone, full_name)").eq("id", id).single();
      if (queryError) setError("Listing not found.");
      else {
        const nextListing = data as Listing;
        setListing(nextListing);
        setTitle(nextListing.title);
        setDescription(nextListing.description ?? "");
        setPrice(nextListing.price?.toString() ?? "");
        setLocation(nextListing.location ?? "");
      }
      setLoading(false);
    }
    if (id) void loadListing();
  }, [id]);

  const owner = Boolean(user && listing && user.id === listing.owner_id);
  const whatsappHref = useMemo(() => {
    const phone = listing?.profiles?.[0]?.phone?.replace(/[^\d+]/g, "").replace(/^\+/, "");
    const text = encodeURIComponent(`Hi, I'm interested in "${listing?.title ?? "this listing"}" on Maseno Connect.`);
    return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
  }, [listing]);

  async function updateListing(changes: Record<string, string | number | null>) {
    if (!listing) return;
    setSaving(true);
    const { data, error: updateError } = await supabase.from("listings").update(changes).eq("id", listing.id).select("id, owner_id, type, category, title, description, price, images, location, status, profiles(phone, full_name)").single();
    if (updateError) setError(updateError.message);
    else {
      const updated = data as Listing;
      setListing(updated);
      setEditing(false);
    }
    setSaving(false);
  }

  async function markSold() {
    await updateListing({ status: "sold" });
  }

  async function deleteListing() {
    if (!listing || !window.confirm("Delete this listing? This cannot be undone.")) return;
    setSaving(true);
    const { error: deleteError } = await supabase.from("listings").delete().eq("id", listing.id);
    if (deleteError) {
      setError(deleteError.message);
      setSaving(false);
    } else {
      router.replace("/browse");
    }
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#f8faf9] text-sm text-slate-500">Loading listing...</main>;
  if (error || !listing) return <main className="grid min-h-screen place-items-center bg-[#f8faf9] px-5 text-center"><div><h1 className="text-xl font-bold">{error ?? "Listing not found"}</h1><Link href="/browse" className="mt-3 inline-block text-sm font-semibold text-emerald-700">Back to browse</Link></div></main>;

  return (
    <main className="min-h-screen bg-[#f8faf9] px-5 pb-28 pt-8 text-slate-900">
      <article className="mx-auto max-w-3xl">
        <Link href="/browse" className="text-sm font-semibold text-emerald-700">← Back to browse</Link>
        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {listing.images?.length ? <div className="grid gap-1 bg-slate-100 sm:grid-cols-2">{listing.images.map((image, index) => <div key={image} className={`relative aspect-square ${index === 0 && listing.images && listing.images.length > 1 ? "sm:col-span-2 sm:aspect-[2/1]" : ""}`}><Image src={image} alt={`${listing.title} image ${index + 1}`} fill unoptimized className="object-cover" /></div>)}</div> : <div className="grid aspect-video place-items-center bg-emerald-50 text-5xl">✦</div>}
          <div className="p-6 sm:p-8">
            <span className="text-xs font-bold uppercase tracking-wide text-emerald-700">{listing.type}{listing.category ? ` · ${listing.category}` : ""}</span>
            {editing ? <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} /> : <h1 className="mt-2 text-3xl font-black tracking-tight">{listing.title}</h1>}
            {editing ? <input type="number" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Price" className={inputClass} /> : listing.price !== null && <p className="mt-3 text-xl font-bold text-emerald-700">KSh {new Intl.NumberFormat("en-KE").format(listing.price)}</p>}
            {editing ? <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className={`${inputClass} mt-4 resize-none`} /> : listing.description && <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600">{listing.description}</p>}
            {editing ? <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location" className={inputClass} /> : <p className="mt-6 text-sm text-slate-500">{listing.location ?? "Maseno campus"}</p>}

            {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="mt-7 flex flex-wrap gap-3">
              {!owner ? <a href={whatsappHref} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700">Message on WhatsApp</a> : editing ? <><button disabled={saving} onClick={() => void updateListing({ title: title.trim(), description: description.trim() || null, price: price ? Number(price) : null, location: location.trim() || null })} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : "Save changes"}</button><button onClick={() => setEditing(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold">Cancel</button></> : <><button onClick={() => setEditing(true)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold">Edit</button>{listing.status === "active" && <button disabled={saving} onClick={() => void markSold()} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Mark sold</button>}<button disabled={saving} onClick={() => void deleteListing()} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">Delete</button></>}
            </div>
          </div>
        </div>
        {listing.type === "found" && matches.length > 0 && (
          <section className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">AI-assisted matches</p>
            <h2 className="mt-2 text-xl font-black tracking-tight">Possible owners to contact</h2>
            <div className="mt-4 space-y-3">
              {matches.map((match) => (
                <Link key={match.lost_listing_id} href={`/listing/${match.lost_listing_id}`} className="block rounded-2xl border border-emerald-100 bg-white p-4 transition hover:border-emerald-400">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{match.listing?.title ?? "Lost listing"}</p>
                    <span className="text-sm font-bold text-emerald-700">{Math.round(match.confidence * 100)}%</span>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-600">{match.reason}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";
