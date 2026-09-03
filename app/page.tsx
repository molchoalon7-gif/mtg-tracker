"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fmtDate } from "@/lib/date";
import type { Tournament } from "@/lib/types";

export default function HomePage(){
 const [events,setEvents]=useState<Tournament[]>([]); const [loading,setLoading]=useState(true); const [filter,setFilter]=useState<"open"|"active"|"history">("open");
 useEffect(()=>{void supabase().from("tournaments").select("*").order("starts_at",{ascending:true}).then((result:{data:unknown[]|null})=>{setEvents((result.data??[]) as Tournament[]);setLoading(false)})},[]);
 const shown=events.filter((e)=>filter==="open"?e.status==="registration":filter==="active"?e.status==="active":e.status==="completed"||e.status==="cancelled");
 return <><section className="hero"><div><p className="eyebrow">Magic tournaments, without the clutter</p><h1>Pair. Play. Report.</h1><p className="muted">Create a tournament, collect private decklists, generate fair pairings and let players report their own results.</p></div><Link className="primary" href="/create">Create tournament</Link></section>
 <div className="tabs"><button className={filter==="open"?"tab active":"tab"} onClick={()=>setFilter("open")}>Registration</button><button className={filter==="active"?"tab active":"tab"} onClick={()=>setFilter("active")}>In progress</button><button className={filter==="history"?"tab active":"tab"} onClick={()=>setFilter("history")}>History</button></div>
 {loading?<div className="empty">Loading tournaments…</div>:shown.length===0?<div className="empty"><strong>{filter==="history"?"No tournament history yet":"Nothing here yet"}</strong><span>{filter==="open"?"Create the first tournament and invite players to register.":filter==="active"?"Active tournaments will appear here once pairings are generated.":"Completed and cancelled tournaments will appear here."}</span></div>:<div className="cards">{shown.map((event)=><Link className="panel t-card" key={event.id} href={`/tournaments/${event.id}`}><div className="meta"><span className="pill">{event.format}</span><span className="pill">{event.mode==="async"?"Async":"Scheduled"}</span><span className={`pill status status-${event.status}`}>{event.status}</span></div><h2>{event.name}</h2><p className="muted">{event.description||`${event.resolved_matches_per_player??event.matches_per_player} matches per player`}</p><div className="t-bottom"><span>{fmtDate(event.starts_at)} → {fmtDate(event.ends_at)}</span><span>View →</span></div></Link>)}</div>}
 </>;
}
