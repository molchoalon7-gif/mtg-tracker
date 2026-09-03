import Link from "next/link";
import { AuthControls } from "./AuthControls";

export function Nav() {
  return (
    <header className="topbar">
      <Link href="/" className="brand"><span className="brand-mark">M</span> MTG Tracker</Link>
      <nav aria-label="Main navigation">
        <Link href="/matches">Matches</Link>
        <Link href="/decks">Decks</Link>
        <Link href="/tournaments">Tournaments</Link>
        <AuthControls />
      </nav>
    </header>
  );
}
