import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AccountMenu } from "@/components/AccountMenu";

export const metadata: Metadata = {
  title: "ManaPair",
  description: "Clean Magic: The Gathering tournament software.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link className="brand" href="/">ManaPair</Link>
          <nav>
            <Link href="/">Tournaments</Link>
            <Link href="/create">Create</Link>
            <Link href="/profile">Profile</Link>
            <AccountMenu />
          </nav>
        </header>
        <main className="shell">{children}</main>
        <footer>ManaPair · tournament software for Magic players</footer>
      </body>
    </html>
  );
}
