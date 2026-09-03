"use client";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("manapair-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const saved = localStorage.getItem("manapair-theme") as Theme | null;
    const initial = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    apply(initial);
  }, []);
  const next = theme === "dark" ? "light" : "dark";
  return <button className="theme-toggle" type="button" aria-label={`Switch to ${next} mode`} onClick={() => { setTheme(next); apply(next); }}>
    <span aria-hidden="true">{theme === "dark" ? "☀" : "◐"}</span><span className="theme-label">{theme === "dark" ? "Light" : "Dark"}</span>
  </button>;
}
