"use client";
import { usePathname } from "next/navigation";

export function PageMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="page-motion" key={pathname}>{children}</div>;
}
