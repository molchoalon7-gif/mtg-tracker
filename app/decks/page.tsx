"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { FormatPicker } from "@/components/FormatPicker";
import { parseDecklist } from "@/lib/decklist";
import { ensureProfile, supabase } from "@/lib/supabase";
import type { DeckCard, UserDeck } from "@/lib/types";

type SavedDeck = UserDeck & { user_deck_cards: DeckCard[] };
type ValidCard = { id:string; oracle_id?:string; name:string };

function cardCount(deck:SavedDeck,section:"main"|"sideboard"){
  return deck.user_deck_cards.filter((card)=>card.section===section).reduce((sum,card)=>sum+card.quantity,0);
}
function deckToText(deck:SavedDeck){
  const main=deck.user_deck_cards.filter((card)=>card.section==="main").slice().sort((a,b)=>a.card_name.localeCompare(b.card_name));
  const side=deck.user_deck_cards.filter((card)=>card.section==="sideboard").slice().sort((a,b)=>a.card_name.localeCompare(b.card_name));
  return [...main.map((card)=>`${card.quantity} ${card.card_name}`),...(side.length?["","Sideboard:",...side.map((card)=>`${card.quantity} ${card.card_name}`)]:[])].join("\n");
}

export default function DecksPage(){
  const [user,setUser]=useState<User|null|undefined>(undefined);
  const [decks,setDecks]=useState<SavedDeck[]>([]);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [name,setName]=useState("");
  const [format,setFormat]=useState("Modern");
  const [deckText,setDeckText]=useState("");
  const [search,setSearch]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function load(){
    const db=supabase();
    const {data:userData}=await db.auth.getUser();
    if(!userData.user){setUser(null);setDecks([]);return;}
    await ensureProfile(userData.user); setUser(userData.user);
    const {data,error}=await db.from("user_decks")
      .select("id,user_id,name,format,created_at,updated_at,user_deck_cards(card_name,scryfall_id,oracle_id,quantity,section)")
      .eq("user_id",userData.user.id)
      .order("updated_at",{ascending:false});
    if(error){setMessage(error.message);return;}
    setDecks((data??[]) as unknown as SavedDeck[]);
  }
  useEffect(()=>{void load()},[]);

  const shownDecks=useMemo(()=>{
    const q=search.trim().toLowerCase();
    if(!q)return decks;
    return decks.filter((deck)=>deck.name.toLowerCase().includes(q)||deck.format.toLowerCase().includes(q));
  },[decks,search]);

  function resetEditor(){setEditingId(null);setName("");setFormat("Modern");setDeckText("")}
  function edit(deck:SavedDeck){setEditingId(deck.id);setName(deck.name);setFormat(deck.format);setDeckText(deckToText(deck));setMessage("");window.scrollTo({top:0,behavior:"smooth"})}

  async function save(e:FormEvent){
    e.preventDefault(); if(!user)return;
    setBusy(true);setMessage("");
    try{
      const parsed=parseDecklist(deckText);
      const response=await fetch("/api/cards/validate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({names:parsed.map((card)=>card.name)})});
      const validated=await response.json() as {cards?:ValidCard[];notFound?:string[];error?:string};
      if(!response.ok||validated.error)throw new Error(validated.error||"Could not validate decklist.");
      if(validated.notFound?.length)throw new Error(`Unknown card${validated.notFound.length>1?"s":""}: ${validated.notFound.join(", ")}`);
      const byName=new Map((validated.cards??[]).map((card)=>[card.name.toLowerCase(),card]));
      const cards:DeckCard[]=parsed.map((entry)=>{const card=byName.get(entry.name.toLowerCase());return {card_name:card?.name||entry.name,scryfall_id:card?.id||null,oracle_id:card?.oracle_id||null,quantity:entry.quantity,section:entry.section}});
      const {error}=await supabase().rpc("save_user_deck",{p_deck_id:editingId,p_name:name.trim(),p_format:format,p_cards:cards});
      if(error)throw error;
      const wasEditing=Boolean(editingId); resetEditor(); await load(); setMessage(wasEditing?"Deck updated.":"Deck saved to your library.");
    }catch(error){setMessage(error instanceof Error?error.message:"Could not save deck.")}finally{setBusy(false)}
  }

  async function remove(deck:SavedDeck){
    if(!user||!confirm(`Delete “${deck.name}” from your Decks library? Tournament copies already submitted will not be affected.`))return;
    setBusy(true);setMessage("");
    const {error}=await supabase().from("user_decks").delete().eq("id",deck.id).eq("user_id",user.id);
    setBusy(false);
    if(error){setMessage(error.message);return;}
    if(editingId===deck.id)resetEditor();
    setMessage("Deck removed from your library."); await load();
  }

  if(user===undefined)return <div className="empty">Loading decks…</div>;
  if(!user)return <div className="empty"><strong>Sign in to use Decks</strong><span>Your reusable deck library is private to your account.</span><div className="empty-action"><a className="primary" href="/login">Sign in</a></div></div>;

  return <>
    <div className="page-head"><div><p className="eyebrow">Your library</p><h1>Decks</h1></div><div><p className="muted">Keep named decklists ready for future tournaments. Your library stays private.</p><button className="primary" onClick={resetEditor}>New deck</button></div></div>
    {message?<div className={message.toLowerCase().includes("could not")||message.toLowerCase().includes("unknown")||message.toLowerCase().includes("error")?"message error":"message"}>{message}</div>:null}
    <div className="split">
      <div className="grid">
        <section className="panel"><div className="form"><label>Find a deck<input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search by deck name or format"/></label></div></section>
        {shownDecks.length===0?<div className="empty compact"><strong>{decks.length?"No decks match":"No saved decks yet"}</strong><span>{decks.length?"Try a different search.":"Create your first reusable deck on the right."}</span></div>:<div className="grid grid-2">{shownDecks.map((deck)=><section className="panel" key={deck.id}>
          <div className="meta"><span className="pill">{deck.format}</span><span className="pill">{cardCount(deck,"main")} main</span>{cardCount(deck,"sideboard")?<span className="pill">{cardCount(deck,"sideboard")} side</span>:null}</div>
          <h2>{deck.name}</h2><p className="tiny">Updated {new Date(deck.updated_at).toLocaleDateString()}</p>
          <details><summary className="quiet-button">View decklist</summary><DeckPreview deck={deck}/></details>
          <div className="actions"><button className="secondary" disabled={busy} onClick={()=>edit(deck)}>Edit</button><button className="danger" disabled={busy} onClick={()=>void remove(deck)}>Delete</button></div>
        </section>)}</div>}
      </div>
      <aside className="panel registration-box"><p className="eyebrow">{editingId?"Edit deck":"New deck"}</p><h2>{editingId?"Update saved deck":"Add to Decks"}</h2><form className="form" onSubmit={save}>
        <label>Deck name<input value={name} onChange={(e)=>setName(e.target.value)} maxLength={80} placeholder="Jeskai Control" required/></label>
        <label>Format<FormatPicker value={format} onChange={setFormat}/></label>
        <label>Decklist<textarea className="decklist-textarea" value={deckText} onChange={(e)=>setDeckText(e.target.value)} placeholder={'4 Lightning Bolt\n4 Counterspell\n...\n\nSideboard:\n2 Dispel\n...'} required/><span className="hint">Use “quantity card name”. Card names are validated with Scryfall before the deck is saved.</span></label>
        <div className="privacy-note"><strong>Private library.</strong> Other users cannot browse your saved decks. A tournament only receives a frozen copy after you choose that deck to register.</div>
        <div className="actions"><button className="primary" disabled={busy||!name.trim()||!deckText.trim()}>{busy?"Saving…":editingId?"Update deck":"Save deck"}</button>{editingId?<button type="button" className="secondary" disabled={busy} onClick={resetEditor}>Cancel</button>:null}</div>
      </form></aside>
    </div>
  </>;
}

function DeckPreview({deck}:{deck:SavedDeck}){
  const main=deck.user_deck_cards.filter((card)=>card.section==="main").slice().sort((a,b)=>a.card_name.localeCompare(b.card_name));
  const side=deck.user_deck_cards.filter((card)=>card.section==="sideboard").slice().sort((a,b)=>a.card_name.localeCompare(b.card_name));
  return <div className="deck-preview"><p className="deck-title">Main deck</p>{main.map((card)=><div className="deck-line" key={`m-${card.card_name}`}><span>{card.quantity} {card.card_name}</span></div>)}{side.length?<><p className="deck-title">Sideboard</p>{side.map((card)=><div className="deck-line" key={`s-${card.card_name}`}><span>{card.quantity} {card.card_name}</span></div>)}</>:null}</div>;
}
