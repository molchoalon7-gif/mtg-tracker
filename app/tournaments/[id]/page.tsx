"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { ensureProfile, supabase } from "@/lib/supabase";
import { parseDecklist } from "@/lib/decklist";
import { fmtDate, fmtDateTime } from "@/lib/date";
import type { DeckCard, Decklist, MatchRow, Profile, Standing, Tournament } from "@/lib/types";

type PlayerJoin = { user_id:string; decklist_id:string|null; profiles:{display_name:string}|{display_name:string}[]|null };
type Dispute = { id:string; match_id:string; raised_by:string; reason:string|null; status:string };
type DeckWithCards = Decklist & { decklist_cards: DeckCard[] };
type ValidCard = { id:string; oracle_id?:string; name:string };

function relName(value:PlayerJoin["profiles"]){if(!value)return "Player";return Array.isArray(value)?value[0]?.display_name??"Player":value.display_name}

export default function TournamentPage(){
 const params=useParams<{id:string}>(); const id=params.id; const [event,setEvent]=useState<Tournament|null>(null); const [user,setUser]=useState<User|null>(null); const [players,setPlayers]=useState<PlayerJoin[]>([]); const [matches,setMatches]=useState<MatchRow[]>([]); const [standings,setStandings]=useState<Standing[]>([]); const [profiles,setProfiles]=useState<Profile[]>([]); const [disputes,setDisputes]=useState<Dispute[]>([]); const [decklists,setDecklists]=useState<DeckWithCards[]>([]); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false); const [deckText,setDeckText]=useState(""); const [deckName,setDeckName]=useState("");
 const isAdmin=Boolean(user&&event&&event.created_by===user.id); const joined=Boolean(user&&players.some((p)=>p.user_id===user.id)); const names=useMemo(()=>Object.fromEntries(profiles.map((p)=>[p.user_id,p.display_name])),[profiles]);
 async function load(){const db=supabase(); const {data:userData}=await db.auth.getUser(); if(userData.user)await ensureProfile(userData.user); setUser(userData.user??null);
   const [{data:t},{data:p},{data:m},{data:s},{data:allProfiles},{data:d},{data:dl}]=await Promise.all([
    db.from("tournaments").select("*").eq("id",id).single(),
    db.from("tournament_players").select("user_id,decklist_id,profiles(display_name)").eq("tournament_id",id),
    db.from("tournament_matches").select("id,tournament_id,player_a,player_b,player_a_wins,player_b_wins,status,reported_by").eq("tournament_id",id),
    db.from("tournament_standings").select("*").eq("tournament_id",id).order("points",{ascending:false}).order("game_wins",{ascending:false}),
    db.from("profiles").select("user_id,display_name"),
    userData.user?db.from("match_disputes").select("id,match_id,raised_by,reason,status").eq("status","open"):Promise.resolve({data:[]}),
    db.from("decklists").select("id,tournament_id,user_id,name,submitted_at,decklist_cards(card_name,scryfall_id,oracle_id,quantity,section)").eq("tournament_id",id)
   ]);
   setEvent(t as Tournament); setPlayers((p??[]) as unknown as PlayerJoin[]); setMatches((m??[]) as MatchRow[]); setStandings((s??[]) as Standing[]); setProfiles((allProfiles??[]) as Profile[]); setDisputes((d??[]) as Dispute[]); setDecklists((dl??[]) as unknown as DeckWithCards[]);
 }
 useEffect(()=>{void load()},[id]);

 async function register(){if(!user)return location.href="/login"; setBusy(true);setMessage(""); try{
   const parsed=parseDecklist(deckText); const response=await fetch("/api/cards/validate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({names:parsed.map((c)=>c.name)})}); const validated=await response.json() as {cards?:ValidCard[];notFound?:string[];error?:string};
   if(!response.ok||validated.error)throw new Error(validated.error||"Could not validate decklist."); if(validated.notFound?.length)throw new Error(`Unknown card${validated.notFound.length>1?"s":""}: ${validated.notFound.join(", ")}`);
   const byName=new Map((validated.cards??[]).map((c)=>[c.name.toLowerCase(),c])); const db=supabase(); const {data:deck,error:deckErr}=await db.from("decklists").insert({tournament_id:id,user_id:user.id,name:deckName.trim()||null}).select("id").single(); if(deckErr)throw deckErr;
   const cardRows=parsed.map((entry)=>{const card=byName.get(entry.name.toLowerCase()); return {decklist_id:deck.id,card_name:card?.name||entry.name,scryfall_id:card?.id||null,oracle_id:card?.oracle_id||null,quantity:entry.quantity,section:entry.section}});
   const {error:cardsErr}=await db.from("decklist_cards").insert(cardRows); if(cardsErr){await db.from("decklists").delete().eq("id",deck.id);throw cardsErr;}
   const {error:joinErr}=await db.from("tournament_players").insert({tournament_id:id,user_id:user.id,decklist_id:deck.id}); if(joinErr){await db.from("decklists").delete().eq("id",deck.id);throw joinErr;}
   setDeckText("");setDeckName("");setMessage("Registered. Your decklist stays private until the tournament is completed.");await load();
 }catch(error){setMessage(error instanceof Error?error.message:"Registration failed.")}finally{setBusy(false)}}

 async function start(){setBusy(true);setMessage("");const {error}=await supabase().rpc("start_tournament",{p_tournament_id:id});setBusy(false);if(error){setMessage(error.message);return}await load()}
 async function finish(){if(!confirm("Finish this tournament? Decklists will become public in tournament history."))return;setBusy(true);const {error}=await supabase().from("tournaments").update({status:"completed",updated_at:new Date().toISOString()}).eq("id",id);setBusy(false);if(error)setMessage(error.message);else await load()}
 async function saveScore(match:MatchRow,a:number,b:number){if(!user)return;setBusy(true);setMessage("");const {error}=await supabase().from("tournament_matches").update({player_a_wins:a,player_b_wins:b,status:"reported",reported_by:user.id,updated_at:new Date().toISOString()}).eq("id",match.id);if(error)setMessage(error.message);else{if(isAdmin)await supabase().from("match_disputes").update({status:"resolved",resolved_at:new Date().toISOString(),resolved_by:user.id}).eq("match_id",match.id).eq("status","open");await load()}setBusy(false)}
 async function dispute(matchId:string){if(!user)return;const reason=prompt("What is wrong with this score? (optional)")??"";const {error}=await supabase().from("match_disputes").insert({match_id:matchId,raised_by:user.id,reason:reason.trim()||null});if(error)setMessage(error.message);else{setMessage("The tournament admin has been notified.");await load()}}

 if(!event)return <div className="empty">Loading tournament…</div>;
 const myMatches=user?matches.filter((m)=>m.player_a===user.id||m.player_b===user.id):[]; const shownMatches=isAdmin?matches:myMatches; const exactPossible=players.length>0&&event.matches_per_player<players.length&&(players.length*event.matches_per_player)%2===0;
 return <>
  <div className="page-head"><div><div className="meta"><span className="pill">{event.format}</span><span className="pill">{event.mode==="async"?"Async league":"Scheduled"}</span><span className={`pill status status-${event.status}`}>{event.status}</span></div><h1 style={{marginTop:14}}>{event.name}</h1></div>{isAdmin?<div className="actions">{event.status==="registration"?<button className="primary" disabled={busy||!exactPossible} onClick={start}>Generate pairings</button>:null}{event.status==="active"?<button className="secondary" disabled={busy} onClick={finish}>Finish tournament</button>:null}</div>:null}</div>
  <div className="stats"><div className="stat"><small>Players</small><strong>{players.length}</strong></div><div className="stat"><small>Matches / player</small><strong>{event.matches_per_player}</strong></div><div className="stat"><small>Starts</small><strong style={{fontSize:18}}>{fmtDate(event.starts_at)}</strong></div><div className="stat"><small>Ends</small><strong style={{fontSize:18}}>{fmtDate(event.ends_at)}</strong></div></div>
  {event.description?<p className="muted" style={{maxWidth:760}}>{event.description}</p>:null}
  {message?<div className={message.toLowerCase().includes("failed")||message.toLowerCase().includes("unknown")||message.toLowerCase().includes("impossible")?"message error":"message"} style={{marginBottom:18}}>{message}</div>:null}
  {isAdmin&&event.status==="registration"&&!exactPossible&&players.length>0?<div className="message error" style={{marginBottom:18}}>Pairings cannot start with {players.length} players × {event.matches_per_player} matches each. Every player needs unique opponents and the total number of player-slots must be even.</div>:null}
  <div className="split"><div className="grid">
   <section className="panel"><h2>{event.status==="registration"?"Players":"Standings"}</h2>{event.status==="registration"?<div>{players.length===0?<div className="empty"><strong>No players yet</strong><span>Share this page so players can register with their decklists.</span></div>:players.map((p)=><div className="history-row" key={p.user_id}><a href={`/players/${p.user_id}`}><strong>{relName(p.profiles)}</strong></a><span className="tiny">registered</span></div>)}</div>:<div className="table-wrap"><table><thead><tr><th>#</th><th>Player</th><th>Pts</th><th>W-D-L</th><th>Win rate</th><th>Games</th></tr></thead><tbody>{standings.map((s,i)=><tr key={s.user_id}><td>{i+1}</td><td><a href={`/players/${s.user_id}`}><strong>{s.display_name}</strong></a></td><td><strong>{s.points}</strong></td><td>{s.wins}-{s.draws}-{s.losses}</td><td>{s.win_rate}%</td><td>{s.game_wins}-{s.game_losses}</td></tr>)}</tbody></table></div>}</section>
   {event.status!=="registration"&&user?<section className="panel"><h2>{isAdmin?"Matches & admin controls":"Your matches"}</h2>{shownMatches.length===0?<div className="empty"><strong>No matches to show</strong></div>:shownMatches.map((m)=><MatchCard key={m.id} match={m} names={names} userId={user.id} admin={isAdmin} busy={busy} disputes={disputes} onSave={saveScore} onDispute={dispute}/>)}</section>:null}
   {event.status==="completed"?<Decklists decklists={decklists} names={names}/>:isAdmin&&decklists.length?<section className="panel"><h2>Private decklists</h2><p className="privacy-note"><strong>Admin only:</strong> these stay hidden from other players until the tournament ends.</p><DecklistsInner decklists={decklists} names={names}/></section>:null}
  </div>
  <aside className="grid registration-box">
   <section className="panel"><p className="eyebrow">Event details</p><div className="history-row"><span>Registration closes</span><strong>{fmtDateTime(event.registration_deadline)}</strong></div><div className="history-row"><span>Window</span><strong>{fmtDate(event.starts_at)} – {fmtDate(event.ends_at)}</strong></div><div className="history-row"><span>Mode</span><strong>{event.mode==="async"?"Play anytime":"Scheduled"}</strong></div></section>
   {event.status==="registration"&&!joined?<section className="panel"><h2>Register</h2>{!user?<><p className="muted">Sign in to enter this tournament.</p><a className="primary" href="/login">Sign in</a></>:<div className="form"><label>Deck name <span className="hint">optional</span><input value={deckName} onChange={(e)=>setDeckName(e.target.value)} placeholder="Jeskai Control"/></label><label>Decklist<textarea className="decklist-textarea" value={deckText} onChange={(e)=>setDeckText(e.target.value)} placeholder={'4 Lightning Bolt\n4 Counterspell\n...\n\nSideboard:\n2 Dispel\n...'}/><span className="hint">Use “quantity card name”. Card names are validated against Scryfall's complete Magic card catalog.</span></label><div className="privacy-note"><strong>Private until the event ends.</strong> Only you and the tournament admin can see your list while the tournament is running.</div><button className="primary" disabled={busy||!deckText.trim()} onClick={register}>{busy?"Validating…":"Submit decklist & register"}</button></div>}</section>:null}
   {joined&&event.status==="registration"?<section className="panel"><h2>You’re registered</h2><p className="muted">Your decklist is locked to this entry and remains private until the tournament is completed.</p></section>:null}
  </aside></div>
 </>;
}

function MatchCard({match,names,userId,admin,busy,disputes,onSave,onDispute}:{match:MatchRow;names:Record<string,string>;userId:string;admin:boolean;busy:boolean;disputes:Dispute[];onSave:(m:MatchRow,a:number,b:number)=>Promise<void>;onDispute:(id:string)=>Promise<void>}){
 const [a,setA]=useState(match.player_a_wins??0); const [b,setB]=useState(match.player_b_wins??0); const mine=match.player_a===userId||match.player_b===userId; const open=disputes.filter((d)=>d.match_id===match.id);
 useEffect(()=>{setA(match.player_a_wins??0);setB(match.player_b_wins??0)},[match.player_a_wins,match.player_b_wins]);
 return <div className="match"><div><div className="match-title">{names[match.player_a]||"Player"} <span className="muted">vs</span> {names[match.player_b]||"Player"}</div>{open.length?<div className="tiny" style={{color:"var(--danger)",marginTop:5}}>Score disputed{admin?` · ${open.length} open`:""}</div>:<div className="tiny" style={{marginTop:5}}>{match.status==="reported"?"Result reported":"Awaiting result"}</div>}</div><div><div className="score-form"><select className="score-select" value={a} onChange={(e)=>setA(Number(e.target.value))}>{[0,1,2].map((v)=><option key={v}>{v}</option>)}</select><strong>–</strong><select className="score-select" value={b} onChange={(e)=>setB(Number(e.target.value))}>{[0,1,2].map((v)=><option key={v}>{v}</option>)}</select>{(admin||match.status==="pending")?<button className="secondary" disabled={busy} onClick={()=>void onSave(match,a,b)}>{admin&&match.status==="reported"?"Correct":"Report"}</button>:null}</div>{mine&&match.status==="reported"&&!open.some((d)=>d.raised_by===userId)?<button className="dispute" onClick={()=>void onDispute(match.id)}>Score incorrect? Notify admin</button>:null}</div></div>
}
function Decklists({decklists,names}:{decklists:DeckWithCards[];names:Record<string,string>}){return <section className="panel"><h2>Decklists</h2><p className="muted">The tournament is complete, so submitted decklists are now public.</p><DecklistsInner decklists={decklists} names={names}/></section>}
function DecklistsInner({decklists,names}:{decklists:DeckWithCards[];names:Record<string,string>}){if(!decklists.length)return <div className="empty">No decklists available.</div>;return <div className="grid grid-2">{decklists.map((d)=><div key={d.id}><h3>{names[d.user_id]||"Player"}{d.name?` · ${d.name}`:""}</h3><div className="deck-preview"><p className="deck-title">Main deck</p>{d.decklist_cards.filter((c)=>c.section==="main").sort((a,b)=>a.card_name.localeCompare(b.card_name)).map((c)=><div className="deck-line" key={`m-${c.card_name}`}><span>{c.quantity} {c.card_name}</span></div>)}{d.decklist_cards.some((c)=>c.section==="sideboard")?<><p className="deck-title">Sideboard</p>{d.decklist_cards.filter((c)=>c.section==="sideboard").sort((a,b)=>a.card_name.localeCompare(b.card_name)).map((c)=><div className="deck-line" key={`s-${c.card_name}`}><span>{c.quantity} {c.card_name}</span></div>)}</>:null}</div></div>)}</div>}
