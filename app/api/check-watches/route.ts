import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type Listing = {
  id: string;
  type: string;
  category: string | null;
  title: string;
  description: string | null;
  price: number | null;
};

type Watch = {
  user_id: string;
  type: string | null;
  category: string | null;
  keywords: string | null;
  max_price: number | null;
};

export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "Server notifications are not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { listingId?: string } | null;
  if (!body?.listingId) return NextResponse.json({ error: "listingId is required." }, { status: 400 });

  const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!accessToken) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await admin.auth.getUser(accessToken);
  if (authError || !authData.user) return NextResponse.json({ error: "Invalid authentication." }, { status: 401 });

  const { data: listing, error: listingError } = await admin.from("listings").select("id, owner_id, type, category, title, description, price").eq("id", body.listingId).single();
  if (listingError || !listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if (listing.owner_id !== authData.user.id) return NextResponse.json({ error: "Only the listing owner can trigger matching." }, { status: 403 });

  const { data: watches, error: watchesError } = await admin.from("watches").select("user_id, type, category, keywords, max_price");
  if (watchesError) return NextResponse.json({ error: watchesError.message }, { status: 500 });

  const currentListing = listing as Listing & { owner_id: string };
  const matches = (watches as Watch[]).filter((watch) => {
    const searchable = `${currentListing.title} ${currentListing.description ?? ""}`.toLowerCase();
    const keywordMatches = !watch.keywords || searchable.includes(watch.keywords.trim().toLowerCase());
    const typeMatches = !watch.type || watch.type === currentListing.type;
    const categoryMatches = !watch.category || watch.category.toLowerCase() === currentListing.category?.toLowerCase();
    const priceMatches = watch.max_price === null || (currentListing.price !== null && currentListing.price <= watch.max_price);
    return typeMatches && categoryMatches && keywordMatches && priceMatches;
  });

  if (matches.length > 0) {
    const { error: insertError } = await admin.from("notifications").insert(matches.map((watch) => ({
      user_id: watch.user_id,
      listing_id: currentListing.id,
      message: `New listing matches your watch: ${currentListing.title}`,
    })));
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ notified: matches.length });
}
