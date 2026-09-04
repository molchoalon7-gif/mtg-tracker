"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ensureProfile, normalizeIsraeliPhone, normalizeUsername, supabase, validIsraeliMobilePhone, validUsername } from "@/lib/supabase";

export default function LoginPage() {
  const [mode,setMode]=useState<"login"|"signup">("login");
  const [name,setName]=useState(""); const [username,setUsername]=useState(""); const [email,setEmail]=useState(""); const [phone,setPhone]=useState(""); const [password,setPassword]=useState(""); const [agreed,setAgreed]=useState(false); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);

  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMessage(""); const db=supabase();
    if(mode==="signup"){
      if(!agreed){setMessage("You need to agree to the Terms of Service and Privacy Notice to create an account.");setBusy(false);return;}
      const cleanUsername=normalizeUsername(username);
      const cleanPhone=normalizeIsraeliPhone(phone);
      if(!validUsername(cleanUsername)){setMessage("Username must be 3–24 characters using lowercase letters, numbers or _.");setBusy(false);return;}
      if(!validIsraeliMobilePhone(cleanPhone)){setMessage("Phone number must be a 10-digit Israeli mobile number starting with 05.");setBusy(false);return;}

      const {data,error}=await db.functions.invoke("instant-signup",{body:{display_name:name,username:cleanUsername,email,phone:cleanPhone,password,accepted_terms:true}});
      if(error){setMessage("Could not create account. Please try again.");setBusy(false);return;}
      if(data?.error){setMessage(String(data.error));setBusy(false);return;}

      const {data:loginData,error:loginError}=await db.auth.signInWithPassword({email,password});
      if(loginError){setMessage("Account created, but automatic sign-in failed. Switch to Sign in and use the email and password you just registered.");setMode("login");setBusy(false);return;}
      try{await ensureProfile(loginData.user)}catch(err){setMessage(err instanceof Error?err.message:"Could not load profile.");setBusy(false);return}
      location.href="/";return;
    }

    const {data,error}=await db.auth.signInWithPassword({email,password});
    if(error){setMessage(error.message);setBusy(false);return;}
    try{await ensureProfile(data.user)}catch(err){setMessage(err instanceof Error?err.message:"Could not load profile.");setBusy(false);return}
    location.href="/";
  }

  return <div className="panel auth-panel"><p className="eyebrow">ManaPair account</p><h2>{mode==="login"?"Sign in":"Create account"}</h2><form className="form" onSubmit={submit}>
    {mode==="signup"?<><label>Display name<input minLength={2} maxLength={32} required value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your player name"/></label><label>Username<input minLength={3} maxLength={24} required value={username} onChange={(e)=>setUsername(normalizeUsername(e.target.value))} placeholder="your_username"/><span className="hint">Unique. Friends and tournament admins find you with this.</span></label></>:null}
    <label>Email<input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}/>{mode==="signup"?<span className="hint">Used to sign in and, during an active event, visible only to players you are paired against. No confirmation email is required.</span>:null}</label>
    {mode==="signup"?<label>Israeli mobile number<input type="tel" inputMode="numeric" autoComplete="tel" maxLength={10} required value={phone} onChange={(e)=>setPhone(normalizeIsraeliPhone(e.target.value))} placeholder="0501234567"/><span className="hint">Must start with 05 and contain exactly 10 digits. No SMS confirmation is used. This number can be shown only to players you are paired against in an active tournament.</span></label>:null}
    <label>Password<input type="password" minLength={8} required value={password} onChange={(e)=>setPassword(e.target.value)}/></label>
    {mode==="signup"?<label className="legal-check"><input type="checkbox" checked={agreed} onChange={(e)=>setAgreed(e.target.checked)} required/><span>I agree to the <Link href="/terms" target="_blank">Terms of Service</Link> and acknowledge the <Link href="/privacy" target="_blank">Privacy Notice</Link>, including sharing my registered email address and phone number with players I am paired against for tournament coordination.</span></label>:null}
    <button className="primary" disabled={busy}>{busy?"Working…":mode==="login"?"Sign in":"Create account"}</button>
    {message?<div className="message">{message}</div>:null}
  </form><button className="nav-button auth-switch" onClick={()=>{setMode(mode==="login"?"signup":"login");setMessage("");setAgreed(false)}}>{mode==="login"?"New here? Create an account":"Already have an account? Sign in"}</button></div>
}
