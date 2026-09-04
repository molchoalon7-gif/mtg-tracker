"use client";
import { FormEvent, useEffect, useState } from "react";
import { FormatPicker } from "@/components/FormatPicker";
import { ensureProfile, supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function CreateTournament(){
 const [user,setUser]=useState<User|null>(null); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(""); const [format,setFormat]=useState("Modern");
 useEffect(()=>{void supabase().auth.getUser().then(async({data})=>{if(data.user)await ensureProfile(data.user);setUser(data.user??null)})},[]);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault(); if(!user)return location.href="/login"; setBusy(true);setMessage(""); const form=new FormData(e.currentTarget);
   const start=new Date(String(form.get("start"))); const end=new Date(String(form.get("end"))); const deadline=new Date(String(form.get("deadline")));
   const payload={created_by:user.id,name:String(form.get("name")),description:String(form.get("description")||"")||null,format,mode:String(form.get("mode")),starts_at:start.toISOString(),ends_at:end.toISOString(),registration_deadline:deadline.toISOString(),max_players:form.get("max")?Number(form.get("max")):null};
   const {data,error}=await supabase().from("tournaments").insert(payload).select("id").single(); setBusy(false); if(error){setMessage(error.message);return;} location.href=`/tournaments/${data.id}`;
 }
 if(user===null)return <div className="empty"><strong>Create a tournament</strong><span>Sign in first, then you can run an event.</span><div className="empty-action"><a className="primary" href="/login">Sign in</a></div></div>;
 return <><div className="page-head"><div><p className="eyebrow">New tournament</p><h1>Create an event</h1></div><p className="muted">Registration, private decklists, pairings, results and standings are handled for you.</p></div><form className="form panel" onSubmit={submit}>
   <label>Tournament name<input name="name" required maxLength={80} placeholder="September League"/></label>
   <div className="form-row"><label>Format<FormatPicker value={format} onChange={setFormat}/></label><label>Mode<select name="mode" defaultValue="async"><option value="async">Asynchronous league</option><option value="scheduled">Scheduled event</option></select><span className="hint">Async lets players complete pairings any time inside the event window.</span></label></div>
   <label>Description<textarea name="description" placeholder="Optional rules or event notes"/></label>
   <div className="form-row"><label>Registration deadline<input name="deadline" type="datetime-local" required/></label><label>Tournament starts<input name="start" type="datetime-local" required/></label></div>
   <div className="form-row"><label>Tournament ends<input name="end" type="datetime-local" required/></label><label>Maximum players <span className="hint">optional</span><input name="max" type="number" min="2" max="256" placeholder="No limit"/></label></div>
   <div className="privacy-note"><strong>Rounds are chosen later.</strong> Once players register, ManaPair gives the tournament admins sensible round-count options based on the actual field size. The admin chooses one before generating pairings.</div>
   {message?<div className="message error">{message}</div>:null}<button className="primary" disabled={busy}>{busy?"Creating…":"Create tournament"}</button>
 </form></>;
}
