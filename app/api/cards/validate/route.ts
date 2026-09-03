import { NextResponse } from "next/server";

type ScryfallCard = { id:string; oracle_id?:string; name:string };
type CollectionResponse = { data?:ScryfallCard[]; not_found?:Array<{name?:string}> };

export async function POST(request: Request) {
  const body = (await request.json()) as { names?: string[] };
  const names = Array.from(new Set((body.names ?? []).map((n) => n.trim()).filter(Boolean)));
  if (!names.length) return NextResponse.json({ cards: [], notFound: [] });
  if (names.length > 300) return NextResponse.json({ error: "Too many unique card names." }, { status: 400 });

  const cards:ScryfallCard[] = [];
  const notFound:string[] = [];
  for (let i = 0; i < names.length; i += 75) {
    const chunk = names.slice(i, i + 75);
    const res = await fetch("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: { "Content-Type":"application/json", "User-Agent":"ManaPair/1.0", "Accept":"application/json;q=0.9,*/*;q=0.8" },
      body: JSON.stringify({ identifiers: chunk.map((name) => ({ name })) }),
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ error: "Card database validation is temporarily unavailable." }, { status: 502 });
    const json = (await res.json()) as CollectionResponse;
    cards.push(...(json.data ?? []));
    notFound.push(...(json.not_found ?? []).map((x) => x.name || "Unknown card"));
  }
  return NextResponse.json({ cards, notFound });
}
