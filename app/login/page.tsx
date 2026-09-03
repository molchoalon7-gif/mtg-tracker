"use client";
import { FormEvent, useState } from "react";
import { ensureProfile, normalizeUsername, supabase, validUsername } from "@/lib/supabase";

export default function LoginPage() {
  const [mode,setMode]=useState<"login"|"signup">("login");
  const [name,setName]=useState(""); const [username,setUsername]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMessage(""); const db=supabase();
    if(mode==="signup"){
      const cleanUsername=normalizeUsername(username);
      if(!validUsername(cleanUsername)){setMessage("Username must be 3–24 characters using lowercase letters, numbers or _. ");setBusy(false);return;}
      const {data:taken}=await db.from("profiles").select("user_id").eq("username",cleanUsername).maybeSingle();
      if(taken){setMessage("That username is already taken.");setBusy(false);return;}
      const {data,error}=await db.auth.signUp({email,password,options:{data:{display_name:name,username:cleanUsername},emailRedirectTo:`${window.location.origin}/login`}});
      if(error){setMessage(error.message);setBusy(false);return;}
      if(data.user && data.session){try{await ensureProfile(data.user)}catch(err){setMessage(err instanceof Error?err.message:"Could not create profile.");setBusy(false);return}location.href="/";return;}
      setMessage("Account created. Check your email to confirm it, then sign in.");
    }else{
      const {data,error}=await db.auth.signInWithPassword({email,password});
      if(error){setMessage(error.message);setBusy(false);return;}
      try{await ensureProfile(data.user)}catch(err){setMessage(err instanceof Error?err.message:"Could not load profile.");setBusy(false);return} location.href="/"; return;
    }
    setBusy(false);
  }
  return <div className="panel auth-panel"><p className="eyebrow">ManaPair account</p><h2>{mode==="login"?"Sign in":"Create account"}</h2><form className="form" onSubmit={submit}>
    {mode==="signup"?<><label>Display name<input minLength={2} maxLength={32} required value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your player name"/></label><label>Username<input minLength={3} maxLength={24} required value={username} onChange={(e)=>setUsername(normalizeUsername(e.target.value))} placeholder="your_username"/><span className="hint">Unique. Friends and tournament admins find you with this.</span></label></>:null}
    <label>Email<input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}/></label>
    <label>Password<input type="password" minLength={6} required value={password} onChange={(e)=>setPassword(e.target.value)}/></label>
    <button className="primary" disabled={busy}>{busy?"Working…":mode==="login"?"Sign in":"Create account"}</button>
    {message?<div className="message">{message}</div>:null}
  </form><button className="nav-button auth-switch" onClick={()=>{setMode(mode==="login"?"signup":"login");setMessage("")}}>{mode==="login"?"New here? Create an account":"Already have an account? Sign in"}</button></div>
}
