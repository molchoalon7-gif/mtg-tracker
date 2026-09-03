export async function GET() {
  return Response.json({ ok: true, service: "mtg-tracker", version: "0.2.0" });
}
