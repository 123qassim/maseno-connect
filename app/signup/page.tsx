"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", course: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "We couldn’t create your account. Please try again.");
      setSubmitting(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: form.name.trim(),
      phone: form.phone.trim() || null,
      course: form.course.trim() || null,
    });

    if (profileError) {
      setError("Your account was created, but we couldn’t save your profile. Please try again.");
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
          <h1 className="text-2xl font-black tracking-tight">Create your account</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Join the campus community in under a minute.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <Field label="Full name" value={form.name} onChange={(value) => updateField("name", value)} required />
            <Field label="Email" type="email" value={form.email} onChange={(value) => updateField("email", value)} required />
            <Field label="Password" type="password" minLength={6} value={form.password} onChange={(value) => updateField("password", value)} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone (optional)" type="tel" value={form.phone} onChange={(value) => updateField("phone", value)} />
              <Field label="Course (optional)" value={form.course} onChange={(value) => updateField("course", value)} />
            </div>

            {error && <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/signin" className="font-bold text-emerald-700 hover:text-emerald-800">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        minLength={minLength}
        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 font-normal outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
      />
    </label>
  );
}
