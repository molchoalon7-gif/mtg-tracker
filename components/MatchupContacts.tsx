"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Contact = { user_id:string; email:string };
type Profile = { user_id:string; display_name:string };
type Match = { player_a:string; player_b:string };

export function MatchupContacts() {
  const pathname = usePathname();
  const tournamentId = useMemo(() => pathname.match(/^\/tournaments\/([^/]+)$/)?.[1] ?? null, [pathname]);
  const [eventName,setEventName]=useState("");
  const [contacts,setContacts]=useState<Array<Contact & {display_name:string}>>([]);
  const [open,setOpen]=useState(false);

  useEffect(() => {
    setOpen(false); setContacts([]); setEventName("");
    if (!tournamentId) return;
    let active=true;
    void (async()=>{
      const db=supabase();
      const {data:userData}=await db.auth.getUser();
      if(!active||!userData.user)return;
      const {data:event}=await db.from("tournaments").select("name,status").eq("id",tournamentId).maybeSingle();
      if(!active||!event||event.status!=="active")return;
      setEventName(event.name);
      const uid=userData.user.id;
      const {data:matches}=await db.from("tournament_matches").select("player_a,player_b").eq("tournament_id",tournamentId).or(`player_a.eq.${uid},player_b.eq.${uid}`);
      const opponents=Array.from(new Set(((matches??[]) as Match[]).map((m)=>m.player_a===uid?m.player_b:m.player_a)));
      if(!opponents.length)return;
      const [{data:contactRows},{data:profileRows}]=await Promise.all([
        db.from("user_contacts").select("user_id,email").in("user_id",opponents),
        db.from("profiles").select("user_id,display_name").in("user_id",opponents),
      ]);
      if(!active)return;
      const names=Object.fromEntries(((profileRows??[]) as Profile[]).map((p)=>[p.user_id,p.display_name]));
      setContacts(((contactRows??[]) as Contact[]).map((c)=>({...c,display_name:names[c.user_id]||"Opponent"})));
    })();
    return()=>{active=false};
  },[tournamentId]);

  if(!tournamentId||!contacts.length)return null;
  return <div className="matchup-contact-dock">
    {open?<div className="matchup-contact-card"><div className="matchup-contact-head"><h3>Match contacts</h3><button className="quiet-button" onClick={()=>setOpen(false)}>Close</button></div>{contacts.map((contact)=><div className="contact-row" key={contact.user_id}><div><strong>{contact.display_name}</strong><div className="tiny">Current opponent</div></div><a href={`mailto:${contact.email}?subject=${encodeURIComponent(`ManaPair · ${eventName}`)}`}>Email</a></div>)}<p className="contact-privacy">Contact details are available only for active pairings and only for tournament coordination.</p></div>:null}
    <button className="primary matchup-contact-toggle" onClick={()=>setOpen((v)=>!v)}>{contacts.length===1?"Contact opponent":`Match contacts · ${contacts.length}`}</button>
  </div>;
}
