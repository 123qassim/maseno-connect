"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "@/src/lib/useAuth";
import { supabase } from "@/src/lib/supabase";

const listingTypes = ["item", "room", "service", "place", "lost", "found"] as const;
type ListingType = (typeof listingTypes)[number];
type Preview = { file: File; url: string };

export default function PostPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef<Preview[]>([]);
  const [type, setType] = useState<ListingType>("item");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/signin");
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, []);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    const availableSlots = 4 - previews.length;
    const nextFiles = selectedFiles.slice(0, availableSlots);

    if (selectedFiles.length > availableSlots) {
      setError("You can add up to 4 images.");
    } else {
      setError(null);
    }

    setPreviews((current) => {
      const nextPreviews = [
        ...current,
        ...nextFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
      ];
      previewsRef.current = nextPreviews;
      return nextPreviews;
    });

    event.target.value = "";
  }

  function removePreview(index: number) {
    setPreviews((current) => {
      const preview = current[index];
      if (preview) URL.revokeObjectURL(preview.url);
      const nextPreviews = current.filter((_, previewIndex) => previewIndex !== index);
      previewsRef.current = nextPreviews;
      return nextPreviews;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      router.replace("/signin");
      return;
    }

    setError(null);
    setSubmitting(true);
    const uploadedPaths: string[] = [];

    try {
      const imageUrls: string[] = [];

      for (const preview of previews) {
        const extension = preview.file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(path, preview.file, { upsert: false, contentType: preview.file.type });

        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
        uploadedPaths.push(path);

        const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
        imageUrls.push(data.publicUrl);
      }

      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert({
          owner_id: user.id,
          type,
          category: category.trim() || null,
          title: title.trim(),
          description: description.trim() || null,
          price: type === "lost" || type === "found" || !price ? null : Number(price),
          images: imageUrls,
          location: location.trim() || null,
          status: "active",
        })
        .select("id")
        .single();

      if (listingError) throw new Error(`Listing could not be created: ${listingError.message}`);
      const session = (await supabase.auth.getSession()).data.session;
      void fetch("/api/check-watches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ listingId: listing.id }),
      });
      let destination = `/listings/${listing.id}`;
      if (type === "found" && session?.access_token) {
        const matchResponse = await fetch("/api/match-lost-found", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ listingId: listing.id }),
        });
        if (matchResponse.ok) {
          const matchData = await matchResponse.json() as { matches?: unknown[] };
          if (matchData.matches?.length) {
            destination += `?matches=${encodeURIComponent(JSON.stringify(matchData.matches))}`;
          }
        }
      }
      router.push(destination);
    } catch (submissionError) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from("listing-images").remove(uploadedPaths);
      }
      setError(submissionError instanceof Error ? submissionError.message : "Could not create listing.");
      setSubmitting(false);
    }
  }

  if (authLoading || !user) {
    return <main className="grid min-h-screen place-items-center bg-[#f8faf9] text-sm text-slate-500">Checking your account...</main>;
  }

  const priceHidden = type === "lost" || type === "found";

  return (
    <main className="min-h-screen bg-[#f8faf9] px-5 pb-28 pt-8 text-slate-900">
      <section className="mx-auto w-full max-w-2xl">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Share with campus</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Post a listing</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Keep it clear so other students can find it quickly.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldLabel label="What are you posting?">
              <select value={type} onChange={(event) => setType(event.target.value as ListingType)} className={inputClass}>
                {listingTypes.map((listingType) => (
                  <option key={listingType} value={listingType}>{listingType[0].toUpperCase() + listingType.slice(1)}</option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Category">
              <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="e.g. Electronics" className={inputClass} />
            </FieldLabel>
          </div>

          <FieldLabel label="Title">
            <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={100} placeholder="e.g. Clean bedsitter near the main gate" className={inputClass} />
          </FieldLabel>

          <FieldLabel label="Description">
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={1000} placeholder="Add useful details for interested students..." className={`${inputClass} resize-none`} />
          </FieldLabel>

          <div className="grid gap-4 sm:grid-cols-2">
            {!priceHidden && (
              <FieldLabel label="Price (KSh, optional)">
                <input type="number" min="0" step="1" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="e.g. 2500" className={inputClass} />
              </FieldLabel>
            )}
            <FieldLabel label="Location">
              <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Siriba campus" className={inputClass} />
            </FieldLabel>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Photos <span className="font-normal text-slate-400">(up to 4)</span></p>
              <span className="text-xs text-slate-400">{previews.length}/4</span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {previews.map((preview, index) => (
                <div key={preview.url} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                  <Image src={preview.url} alt={`Preview ${index + 1}`} fill unoptimized className="object-cover" />
                  <button type="button" onClick={() => removePreview(index)} aria-label={`Remove image ${index + 1}`} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-slate-900/75 text-sm text-white">×</button>
                </div>
              ))}
              {previews.length < 4 && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-2xl text-slate-400 transition hover:border-emerald-400 hover:text-emerald-600">
                  <span>＋</span>
                  <span className="text-[10px] font-semibold">Add photo</span>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="sr-only" />
          </div>

          {error && <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700">{error}</p>}

          <button type="submit" disabled={submitting} className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? "Publishing listing..." : "Publish listing"}
          </button>
        </form>
      </section>
    </main>
  );
}

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}{children}</label>;
}
