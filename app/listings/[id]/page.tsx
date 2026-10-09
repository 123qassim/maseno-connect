"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type Listing = {
  id: string;
  type: string;
  category: string | null;
  title: string;
  description: string | null;
  price: number | null;
  images: string[] | null;
  location: string | null;
  created_at: string;
};

export default function ListingDetailPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#f8faf9] text-sm text-slate-500">Loading listing...</main>}>
      <ListingDetail />
    </Suspense>
  );
}

function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadListing() {
      const { data, error: queryError } = await supabase.from("listings").select("id, type, category, title, description, price, images, location, created_at").eq("id", id).single();
      if (queryError) setError(true);
      else setListing(data as Listing);
    }
    if (id) void loadListing();
  }, [id]);

  if (error) return <main className="grid min-h-screen place-items-center bg-[#f8faf9] px-5 text-center"><div><h1 className="text-xl font-bold">Listing not found</h1><Link href="/" className="mt-3 inline-block text-sm font-semibold text-emerald-700">Back to listings</Link></div></main>;
  if (!listing) return <main className="grid min-h-screen place-items-center bg-[#f8faf9] text-sm text-slate-500">Loading listing...</main>;

  return (
    <main className="min-h-screen bg-[#f8faf9] px-5 pb-20 pt-8 text-slate-900">
      <article className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-semibold text-emerald-700">← Back to listings</Link>
        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {listing.images?.[0] ? <div className="relative aspect-video bg-slate-100"><Image src={listing.images[0]} alt="" fill unoptimized className="object-cover" /></div> : <div className="grid aspect-video place-items-center bg-emerald-50 text-5xl">✦</div>}
          <div className="p-6 sm:p-8">
            <span className="text-xs font-bold uppercase tracking-wide text-emerald-700">{listing.type}{listing.category ? ` · ${listing.category}` : ""}</span>
            <h1 className="mt-2 text-3xl font-black tracking-tight">{listing.title}</h1>
            {listing.price !== null && <p className="mt-3 text-xl font-bold text-emerald-700">KSh {new Intl.NumberFormat("en-KE").format(listing.price)}</p>}
            {listing.description && <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600">{listing.description}</p>}
            <p className="mt-6 text-sm text-slate-500">{listing.location ?? "Maseno campus"}</p>
          </div>
        </div>
      </article>
    </main>
  );
}
