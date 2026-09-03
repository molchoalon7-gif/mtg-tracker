"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  ["Tournaments", "/"],
  ["Create tournament", "/create"],
  ["Friends", "/friends"],
  ["Profile & settings", "/profile"],
  ["Terms", "/terms"],
  ["Privacy", "/privacy"],
] as const;

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.classList.toggle("sheet-open", open);
    return () => document.body.classList.remove("sheet-open");
  }, [open]);

  return <div className="mobile-nav">
    <button className="mobile-menu-button" type="button" aria-expanded={open} aria-label="Open navigation" onClick={() => setOpen(true)}>
      <span/><span/>
    </button>
    {open ? <div className="mobile-menu-backdrop" role="presentation" onMouseDown={(e) => { if (e.currentTarget === e.target) setOpen(false); }}>
      <aside className="mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation">
        <div className="mobile-menu-head"><strong>ManaPair</strong><button className="sheet-close" onClick={() => setOpen(false)} aria-label="Close menu">×</button></div>
        <nav className="mobile-menu-links">
          {links.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}<span>→</span></Link>)}
        </nav>
        <div className="mobile-menu-tools"><ThemeToggle/><AccountMenu/></div>
      </aside>
    </div> : null}
  </div>;
}
