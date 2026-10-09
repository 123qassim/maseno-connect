"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/useAuth";
import { supabase } from "@/src/lib/supabase";

type Profile = { full_name: string | null; phone: string | null; course: string | null };
type Listing = {
  id: string;
  type: string;
  title: string;
  price: number | null;
  images: string[] | null;
  location: string | null;
  status: string;
};
type Watch = { id: string; type: string | null; category: string | null; keywords: string | null; max_price: number | null };

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [watches, setWatches] = useState<Watch[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/signin");
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    async function loadDashboard() {
      setLoading(true);
      const [profileResult, listingsResult, watchesResult, notificationsResult] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, course").eq("id", currentUser.id).maybeSingle(),
        supabase.from("listings").select("id, type, title, price, images, location, status").eq("owner_id", currentUser.id).order("created_at", { ascending: false }),
        supabase.from("watches").select("id, type, category, keywords, max_price").eq("user_id", currentUser.id).order("created_at", { ascending: false }),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", currentUser.id).eq("is_read", false),
      ]);

      const firstError = profileResult.error ?? listingsResult.error ?? watchesResult.error ?? notificationsResult.error;
      if (firstError) {
        setError("Some dashboard information could not be loaded. Please refresh and try again.");
      } else {
        setProfile(profileResult.data as Profile | null);
        setListings((listingsResult.data ?? []) as Listing[]);
        setWatches((watchesResult.data ?? []) as Watch[]);
        setUnreadCount(notificationsResult.count ?? 0);
      }
      setLoading(false);
    }
    void loadDashboard();
  }, [user]);

  async function markSold(listingId: string) {
    setBusyId(listingId);
    const { error: updateError } = await supabase.from("listings").update({ status: "sold" }).eq("id", listingId).eq("owner_id", user?.id);
    if (updateError) setError(updateError.message);
    else setListings((current) => current.map((listing) => listing.id === listingId ? { ...listing, status: "sold" } : listing));
    setBusyId(null);
  }

  async function deleteListing(listingId: string) {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    setBusyId(listingId);
    const { error: deleteError } = await supabase.from("listings").delete().eq("id", listingId).eq("owner_id", user?.id);
    if (deleteError) setError(deleteError.message);
    else setListings((current) => current.filter((listing) => listing.id !== listingId));
    setBusyId(null);
  }

  async function deleteWatch(watchId: string) {
    setBusyId(watchId);
    const { error: deleteError } = await supabase.from("watches").delete().eq("id", watchId).eq("user_id", user?.id);
    if (deleteError) setError(deleteError.message);
    else setWatches((current) => current.filter((watch) => watch.id !== watchId));
    setBusyId(null);
  }

  if (authLoading || !user || loading) {
    return <main className="grid min-h-screen place-items-center bg-[#f8faf9] text-sm text-slate-500">Loading your dashboard...</main>;
  }

  const name = profile?.full_name || user.email?.split("@")[0] || "Maseno student";

  return (
    <main className="min-h-screen bg-[#f8faf9] px-5 pb-28 pt-8 text-slate-900">
      <section className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Your space</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Hi, {name.split(" ")[0]}.</h1>
          </div>
          <button onClick={() => void signOut().then(() => router.replace("/"))} className="text-sm font-semibold text-slate-500 hover:text-slate-900">Sign out</button>
        </header>

        {error && <p className="mt-6 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <Link href="#profile" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300">
            <p className="text-sm text-slate-500">Profile</p>
            <p className="mt-1 font-bold">{name}</p>
            <p className="mt-1 truncate text-xs text-slate-400">{profile?.course || "Add your course"}</p>
          </Link>
          <Link href="/alerts" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300">
            <p className="text-sm text-slate-500">Unread alerts</p>
            <p className="mt-1 text-2xl font-black text-emerald-700">{unreadCount}</p>
            <p className="mt-1 text-xs text-slate-400">View notifications →</p>
          </Link>
          <Link href="/post" className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm transition hover:bg-slate-800">
            <p className="text-sm text-slate-300">Have something to share?</p>
            <p className="mt-2 font-bold">Post a listing →</p>
          </Link>
        </div>

        <section className="mt-10" aria-labelledby="listings-heading">
          <div className="flex items-center justify-between">
            <h2 id="listings-heading" className="text-xl font-bold">My listings <span className="text-sm font-normal text-slate-400">({listings.length})</span></h2>
            <Link href="/browse" className="text-sm font-semibold text-emerald-700">Browse</Link>
          </div>
          {listings.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">You haven’t posted anything yet.</div> : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {listings.map((listing) => (
                <div key={listing.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <Link href={`/listing/${listing.id}`} className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
                    {listing.images?.[0] ? <Image src={listing.images[0]} alt="" fill unoptimized className="object-cover" /> : <span className="grid size-full place-items-center text-2xl">✦</span>}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/listing/${listing.id}`} className="truncate font-bold hover:text-emerald-700">{listing.title}</Link>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${listing.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{listing.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{listing.location || "Maseno campus"}{listing.price !== null ? ` · KSh ${new Intl.NumberFormat("en-KE").format(listing.price)}` : ""}</p>
                    <div className="mt-3 flex gap-3 text-xs font-semibold">
                      <Link href={`/listing/${listing.id}`} className="text-emerald-700">Edit</Link>
                      {listing.status === "active" && <button disabled={busyId === listing.id} onClick={() => void markSold(listing.id)} className="text-amber-700 disabled:opacity-50">Mark sold</button>}
                      <button disabled={busyId === listing.id} onClick={() => void deleteListing(listing.id)} className="text-red-600 disabled:opacity-50">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10" aria-labelledby="watches-heading">
          <div className="flex items-center justify-between">
            <h2 id="watches-heading" className="text-xl font-bold">Active watches <span className="text-sm font-normal text-slate-400">({watches.length})</span></h2>
            <Link href="/browse" className="text-sm font-semibold text-emerald-700">Add watch</Link>
          </div>
          {watches.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No watches saved yet.</div> : (
            <div className="mt-4 space-y-3">
              {watches.map((watch) => (
                <div key={watch.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="min-w-0">
                    <p className="font-semibold">{watch.keywords || "Any new listing"}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{[watch.type, watch.category, watch.max_price !== null ? `Up to KSh ${new Intl.NumberFormat("en-KE").format(watch.max_price)}` : null].filter(Boolean).join(" · ") || "All listings"}</p>
                  </div>
                  <button disabled={busyId === watch.id} onClick={() => void deleteWatch(watch.id)} className="shrink-0 text-sm font-semibold text-red-600 disabled:opacity-50">Delete</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section id="profile" className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Profile</h2>
            <Link href="/dashboard#profile" className="text-sm font-semibold text-emerald-700">Edit profile</Link>
          </div>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
            <div><dt className="text-slate-400">Name</dt><dd className="mt-1 font-semibold">{name}</dd></div>
            <div><dt className="text-slate-400">Email</dt><dd className="mt-1 truncate font-semibold">{user.email}</dd></div>
            <div><dt className="text-slate-400">Phone / course</dt><dd className="mt-1 font-semibold">{profile?.phone || "No phone"} · {profile?.course || "No course"}</dd></div>
          </dl>
        </section>
      </section>
    </main>
  );
}
