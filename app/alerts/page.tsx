"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/useAuth";
import { supabase } from "@/src/lib/supabase";

type Notification = {
  id: string;
  message: string | null;
  listing_id: string | null;
  is_read: boolean;
  created_at: string;
};

export default function AlertsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/signin");
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    async function loadNotifications() {
      const { data, error: queryError } = await supabase.from("notifications").select("id, message, listing_id, is_read, created_at").eq("user_id", currentUser.id).order("created_at", { ascending: false });
      if (queryError) setError(queryError.message);
      else setNotifications((data ?? []) as Notification[]);
      setLoading(false);
    }
    void loadNotifications();
  }, [user]);

  async function markRead(notification: Notification) {
    if (notification.is_read) return;
    const { error: updateError } = await supabase.from("notifications").update({ is_read: true }).eq("id", notification.id);
    if (updateError) setError(updateError.message);
    else setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item));
  }

  if (authLoading || !user) return <main className="grid min-h-screen place-items-center bg-[#f8faf9] text-sm text-slate-500">Checking your account...</main>;

  return (
    <main className="min-h-screen bg-[#f8faf9] px-5 pb-28 pt-8 text-slate-900">
      <section className="mx-auto max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Stay in the loop</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Alerts</h1>
        <p className="mt-2 text-sm text-slate-500">Updates from the watches you saved.</p>
        {error && <p className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading && <p className="mt-8 text-sm text-slate-500">Loading alerts...</p>}
        {!loading && !error && notifications.length === 0 && <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No alerts yet. Save a watch from Browse to get notified.</div>}
        <div className="mt-6 space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${notification.is_read ? "border-slate-200" : "border-emerald-200 bg-emerald-50/30"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{notification.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{new Date(notification.created_at).toLocaleString()}</p>
                </div>
                {!notification.is_read && <button onClick={() => void markRead(notification)} className="shrink-0 text-xs font-bold text-emerald-700">Mark read</button>}
              </div>
              {notification.listing_id && <Link onClick={() => void markRead(notification)} href={`/listing/${notification.listing_id}`} className="mt-3 inline-block text-sm font-bold text-emerald-700">View listing →</Link>}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
