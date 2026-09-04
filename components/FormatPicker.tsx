"use client";
import { useEffect, useState } from "react";

const FORMAT_GROUPS = [
  { label: "Popular constructed", items: ["Standard", "Pioneer", "Modern", "Pauper", "Legacy", "Vintage"] },
  { label: "Commander", items: ["Commander", "cEDH", "Duel Commander"] },
  { label: "Limited", items: ["Draft", "Sealed"] },
  { label: "Other", items: ["Premodern", "Timeless", "Historic", "Explorer"] },
];

export function FormatPicker({ value, onChange, allowEmpty=false }: { value: string; onChange: (format: string) => void; allowEmpty?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", key);
    document.body.classList.add("sheet-open");
    return () => { document.removeEventListener("keydown", key); document.body.classList.remove("sheet-open"); };
  }, [open]);
  return <>
    <button className="picker-button" type="button" onClick={() => setOpen(true)}><span>{value || "No format"}</span><span aria-hidden="true">›</span></button>
    {open ? <div className="sheet-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label="Choose format">
        <div className="sheet-head"><div><p className="eyebrow">Format</p><h2>Choose a format</h2></div><button className="sheet-close" type="button" onClick={() => setOpen(false)}>×</button></div>
        {allowEmpty?<div className="format-options"><button type="button" className={!value?"format-option selected":"format-option"} onClick={()=>{onChange("");setOpen(false)}}><span>No format</span>{!value?<span>✓</span>:null}</button></div>:null}
        <div className="format-groups">{FORMAT_GROUPS.map((group) => <div key={group.label}><p className="format-group-label">{group.label}</p><div className="format-options">{group.items.map((format) => <button key={format} type="button" className={format === value ? "format-option selected" : "format-option"} onClick={() => { onChange(format); setOpen(false); }}><span>{format}</span>{format === value ? <span>✓</span> : null}</button>)}</div></div>)}</div>
      </section>
    </div> : null}
  </>;
}
