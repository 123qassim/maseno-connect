"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#f8faf9] px-5 py-8 text-slate-900 sm:grid sm:place-items-center">
      <section className="mx-auto w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700">
          <span className="grid size-8 place-items-center rounded-xl bg-emerald-600 text-white">M</span>
          Maseno Connect
        </Link>
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-black tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Sign in to continue to your campus dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </label>

            {error && <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New to Maseno Connect?{" "}
            <Link href="/signup" className="font-bold text-emerald-700 hover:text-emerald-800">Create an account</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
