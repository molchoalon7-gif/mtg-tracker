import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ data: [] });
  const res = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(q)}&include_extras=true`, {
    headers: { "User-Agent": "ManaPair/1.0", "Accept": "application/json;q=0.9,*/*;q=0.8" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return NextResponse.json({ data: [] }, { status: 200 });
  const json = (await res.json()) as { data?: string[] };
  return NextResponse.json({ data: json.data ?? [] });
}
