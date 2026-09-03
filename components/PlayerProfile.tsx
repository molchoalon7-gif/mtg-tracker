"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fmtDate } from "@/lib/date";
import type { Profile, Standing, Tournament } from "@/lib/types";

type Overall={user_id:string;display_name:string;played:number;wins:number;draws:number;losses:number;win_rate:number};
export function PlayerProfile({playerId,editable=false}:{playerId:string;editable?:boolean}){
 const [profile,setProfile]=useState<Profile|null>(null);const [overall,setOverall]=useState<Overall|null>(null);const [rows,setRows]=useState<Standing[]>([]);const [events,setEvents]=useState<Tournament[]>([]);const [name,setName]=useState("");const [message,setMessage]=useState("");
 async function load(){const db=supabase();const [{data:p},{data:o},{data:s},{data:t}]=await Promise.all([db.from("profiles").select("user_id,display_name").eq("user_id",playerId).maybeSingle(),db.from("player_overall_stats").select("*").eq("user_id",playerId).maybeSingle(),db.from("tournament_standings").select("*").eq("user_id",playerId),db.from("tournaments").select("*").eq("status","completed").order("ends_at",{ascending:false})]);setProfile(p as Profile|null);setOverall(o as Overall|null);setRows((s??[]) as Standing[]);setEvents((t??[]) as Tournament[]);setName((p as Profile|null)?.display_name??"")}
 useEffect(()=>{void load()},[playerId]); const history=useMemo(()=>rows.map((r)=>({standing:r,event:events.find((e)=>e.id===r.tournament_id)})).filter((x)=>x.event),[rows,events]);
 async function save(){if(!editable||name.trim().length<2)return;const {error}=await supabase().from("profiles").update({display_name:name.trim(),updated_at:new Date().toISOString()}).eq("user_id",playerId);setMessage(error?.message||"Name updated.");if(!error)await load()}
 if(!profile)return <div className="empty">Loading player…</div>;
 return <><div className="profile-head"><div><p className="eyebrow">Player profile</p><h1>{profile.display_name}</h1></div></div><div className="stats"><div className="stat"><small>Matches</small><strong>{overall?.played??0}</strong></div><div className="stat"><small>Wins</small><strong>{overall?.wins??0}</strong></div><div className="stat"><small>Losses</small><strong>{overall?.losses??0}</strong></div><div className="stat"><small>Win rate</small><strong>{overall?.win_rate??0}%</strong></div></div>
 {editable?<section className="panel" style={{marginBottom:18}}><h2>Profile</h2><div className="form-row"><input value={name} maxLength={32} onChange={(e)=>setName(e.target.value)}/><button className="secondary" onClick={save}>Save name</button></div>{message?<p className="tiny" style={{marginTop:10}}>{message}</p>:null}</section>:null}
 <section className="panel"><h2>Tournament history</h2>{history.length===0?<div className="empty"><strong>No completed tournaments yet</strong><span>Past results and public decklists will appear here.</span></div>:history.map(({standing,event})=><Link className="history-row" key={standing.tournament_id} href={`/tournaments/${standing.tournament_id}`}><div><strong>{event!.name}</strong><div className="tiny">{event!.format} · ended {fmtDate(event!.ends_at)}</div></div><div style={{textAlign:"right"}}><strong>{standing.points} pts</strong><div className="tiny">{standing.wins}-{standing.draws}-{standing.losses} · {standing.win_rate}%</div></div></Link>)}</section></>;
}
