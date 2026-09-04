import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import "./mobile-legal.css";
import { AccountMenu } from "@/components/AccountMenu";
import { GeneratedUsernameGuard } from "@/components/GeneratedUsernameGuard";
import { MobileMenu } from "@/components/MobileMenu";
import { MatchupContacts } from "@/components/MatchupContacts";
import { PageMotion } from "@/components/PageMotion";
import { TermsGate } from "@/components/TermsGate";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TournamentAdminTools } from "@/components/TournamentAdminTools";

export const metadata: Metadata = {
  title: "ManaPair",
  description: "Clean Magic: The Gathering tournament software.",
};

const themeBoot = `(()=>{try{const s=localStorage.getItem('manapair-theme');const d=s||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=d}catch{}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBoot }} /></head>
      <body>
        <GeneratedUsernameGuard />
        <header className="topbar">
          <Link className="brand" href="/" aria-label="ManaPair home"><span className="brand-mark" aria-hidden="true"><i/><i/></span><span>ManaPair</span></Link>
          <nav className="desktop-nav">
            <Link href="/">Tournaments</Link>
            <Link href="/create">Create</Link>
            <Link href="/decks">Decks</Link>
            <Link href="/friends">Friends</Link>
            <Link href="/profile">Profile</Link>
            <Link href="/terms">Terms</Link>
            <ThemeToggle />
            <AccountMenu />
          </nav>
          <MobileMenu />
        </header>
        <TermsGate>
          <main className="shell"><PageMotion>{children}</PageMotion></main>
          <TournamentAdminTools />
          <MatchupContacts />
        </TermsGate>
        <footer><span>ManaPair · community tournament software for Magic players</span><span className="footer-links"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link></span></footer>
      </body>
    </html>
  );
}
