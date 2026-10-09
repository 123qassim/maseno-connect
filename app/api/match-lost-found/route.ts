import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type LostListing = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
};

type Match = {
  lost_listing_id: string;
  confidence: number;
  reason: string;
};

function parseMatches(text: string, lostListings: LostListing[]): Match[] {
  const jsonText = text.match(/\[[\s\S]*\]/)?.[0];
  if (!jsonText) return [];

  try {
    const parsed: unknown = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) return [];
    const validIds = new Set(lostListings.map((listing) => listing.id));
    return parsed
      .filter((item): item is Partial<Match> => typeof item === "object" && item !== null)
      .filter((item) => typeof item.lost_listing_id === "string" && validIds.has(item.lost_listing_id))
      .map((item) => ({
        lost_listing_id: item.lost_listing_id as string,
        confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0)),
        reason: typeof item.reason === "string" ? item.reason.slice(0, 300) : "The descriptions appear related.",
      }))
      .filter((item) => item.confidence >= 0.5)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!serviceKey || !anthropicKey) {
    return NextResponse.json({ error: "Lost and found matching is not configured." }, { status: 503 });
  }

  const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!accessToken) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  const body = await request.json().catch(() => null) as { listingId?: string } | null;
  if (!body?.listingId) return NextResponse.json({ error: "listingId is required." }, { status: 400 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await admin.auth.getUser(accessToken);
  if (authError || !authData.user) return NextResponse.json({ error: "Invalid authentication." }, { status: 401 });

  const { data: found, error: foundError } = await admin
    .from("listings")
    .select("id, owner_id, type, title, description, category, location, images")
    .eq("id", body.listingId)
    .eq("type", "found")
    .eq("owner_id", authData.user.id)
    .single();
  if (foundError || !found) return NextResponse.json({ error: "Found listing not found." }, { status: 404 });

  const { data: lostListings, error: lostError } = await admin
    .from("listings")
    .select("id, owner_id, title, description, category, location")
    .eq("type", "lost")
    .eq("status", "active");
  if (lostError) return NextResponse.json({ error: lostError.message }, { status: 500 });
  if (!lostListings?.length) return NextResponse.json({ matches: [] });

  const candidates = lostListings as LostListing[];
  const foundImage = Array.isArray(found.images) ? found.images[0] : null;
  const content: Array<Record<string, unknown>> = [{
    type: "text",
    text: `Found listing:
Title: ${found.title}
Description: ${found.description ?? "None"}
Category: ${found.category ?? "None"}
Location: ${found.location ?? "None"}

Open lost listings to compare:
${candidates.map((listing) => `ID: ${listing.id}
Title: ${listing.title}
Description: ${listing.description ?? "None"}
Category: ${listing.category ?? "None"}
Location: ${listing.location ?? "None"}`).join("\n\n")}

Return only a JSON array of likely matches, with at most 5 entries. Each entry must have:
{"lost_listing_id":"exact candidate ID","confidence":0.0,"reason":"short explanation"}
Use a confidence from 0 to 1. Include only plausible matches with confidence at least 0.5. Do not infer identifying facts that are not present.`,
  }];
  if (foundImage) content.push({ type: "image", source: { type: "url", url: foundImage } });

  const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: 1200,
      temperature: 0,
      messages: [{ role: "user", content }],
    }),
  });
  if (!claudeResponse.ok) {
    return NextResponse.json({ error: "The AI matching service could not be reached." }, { status: 502 });
  }

  const claudeData = await claudeResponse.json() as { content?: { type: string; text?: string }[] };
  const responseText = claudeData.content?.find((block) => block.type === "text")?.text ?? "";
  const matches = parseMatches(responseText, candidates);
  const matchedListings = new Map(candidates.map((listing) => [listing.id, listing]));

  if (matches.length > 0) {
    const notifications = matches.map((match) => ({
      user_id: matchedListings.get(match.lost_listing_id)?.owner_id,
      listing_id: found.id,
      message: `Possible match for your lost item: ${found.title} (${Math.round(match.confidence * 100)}% confidence).`,
    })).filter((notification): notification is { user_id: string; listing_id: string; message: string } => Boolean(notification.user_id));
    if (notifications.length > 0) await admin.from("notifications").insert(notifications);
  }

  return NextResponse.json({
    matches: matches.map((match) => ({
      ...match,
      listing: (() => {
        const listing = matchedListings.get(match.lost_listing_id);
        return listing ? { id: listing.id, title: listing.title, location: listing.location } : undefined;
      })(),
    })),
  });
}
