export type ParsedDeckCard = { quantity: number; name: string; section: "main" | "sideboard" };

export function parseDecklist(text: string): ParsedDeckCard[] {
  const lines = text.split(/\r?\n/);
  const cards: ParsedDeckCard[] = [];
  let section: "main" | "sideboard" = "main";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^(sideboard|sb)\s*:?$/i.test(line)) { section = "sideboard"; continue; }
    const cleaned = line.replace(/^SB:\s*/i, "");
    const match = cleaned.match(/^(\d+)\s*[xX]?\s+(.+)$/);
    if (!match) throw new Error(`Could not read “${line}”. Use format: 4 Lightning Bolt`);
    const quantity = Number(match[1]);
    if (quantity < 1 || quantity > 99) throw new Error(`Invalid quantity on “${line}”.`);
    cards.push({ quantity, name: match[2].trim(), section: /^SB:/i.test(line) ? "sideboard" : section });
  }
  if (!cards.some((c) => c.section === "main")) throw new Error("Add at least one main-deck card.");
  return cards;
}
