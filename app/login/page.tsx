"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { CURRENT_TERMS_VERSION } from "@/lib/legal";
import { ensureProfile, normalizeIsraeliPhone, normalizeUsername, supabase, validIsraeliMobilePhone, validUsername } from "@/lib/supabase";

const PRODUCTION_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://manapair.vercel.app";

export default function LoginPage() {
  const [mode,setMode]=useState<"login"|"signup">("login");
  const [name,setName]=useState(""); const [username,setUsername]=useState(""); const [email,setEmail]=useState(""); const [phone,setPhone]=useState(""); const [password,setPassword]=useState(""); const [agreed,setAgreed]=useState(false); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false); const [waiting,setWaiting]=useState(false); const [confirmed,setConfirmed]=useState(false); const [waitingEmail,setWaitingEmail]=useState("");

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const isWaiting=params.get("waiting")==="1";
    const isConfirmed=params.get("confirmed")==="1";
    setWaiting(isWaiting);
    setConfirmed(isConfirmed);
    setWaitingEmail(params.get("email")||"");
    if(isConfirmed)setMode("login");
  },[]);

  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMessage(""); const db=supabase();
    if(mode==="signup"){
      if(!agreed){setMessage("You need to agree to the Terms of Service and Privacy Notice to create an account.");setBusy(false);return;}
      const cleanUsername=normalizeUsername(username);
      const cleanPhone=normalizeIsraeliPhone(phone);
      if(!validUsername(cleanUsername)){setMessage("Username must be 3–24 characters using lowercase letters, numbers or _. ");setBusy(false);return;}
      if(!validIsraeliMobilePhone(cleanPhone)){setMessage("Phone number must be a 10-digit Israeli mobile number starting with 05.");setBusy(false);return;}
      const {data:taken}=await db.from("profiles").select("user_id").eq("username",cleanUsername).maybeSingle();
      if(taken){setMessage("That username is already taken.");setBusy(false);return;}
      const redirectTo=`${PRODUCTION_URL.replace(/\/$/,"")}/login?confirmed=1`;
      const {data,error}=await db.auth.signUp({email,password,options:{data:{display_name:name,username:cleanUsername,phone:cleanPhone},emailRedirectTo:redirectTo}});
      if(error){setMessage(error.message);setBusy(false);return;}
      if(data.user && data.session){
        try{
          await ensureProfile(data.user);
          const {error:phoneError}=await db.from("user_contacts").update({phone:cleanPhone}).eq("user_id",data.user.id);
          if(phoneError)throw phoneError;
          const {error:termsError}=await db.from("legal_acceptances").insert({user_id:data.user.id,terms_version:CURRENT_TERMS_VERSION});
          if(termsError && termsError.code!=="23505")throw termsError;
        }catch(err){setMessage(err instanceof Error?err.message:"Could not create profile.");setBusy(false);return}
        location.href="/";return;
      }
      location.href=`/login?waiting=1&email=${encodeURIComponent(email)}`;
      return;
    }else{
      const {data,error}=await db.auth.signInWithPassword({email,password});
      if(error){setMessage(error.message);setBusy(false);return;}
      try{await ensureProfile(data.user)}catch(err){setMessage(err instanceof Error?err.message:"Could not load profile.");setBusy(false);return} location.href="/"; return;
    }
  }

  if(waiting)return <div className="panel auth-panel"><p className="eyebrow">Almost there</p><h2>Waiting on email confirmation!</h2><p className="muted">We sent a confirmation link{waitingEmail?<> to <strong>{waitingEmail}</strong></>:null}. Open that email and click the confirmation link.</p><div className="privacy-note"><strong>After clicking the link, return here, refresh the page, and log in.</strong> Your email is the account confirmation method; ManaPair does not send an SMS to verify your phone number.</div><div className="actions"><button className="primary" onClick={()=>location.reload()}>Refresh page</button><button className="secondary" onClick={()=>{setWaiting(false);setMode("login");history.replaceState(null,"","/login")}}>Go to login</button></div></div>;

  return <div className="panel auth-panel"><p className="eyebrow">ManaPair account</p><h2>{mode==="login"?"Sign in":"Create account"}</h2>{confirmed?<div className="message">Email confirmed! You can now log in with the email and password you registered.</div>:null}<form className="form" onSubmit={submit}>
    {mode==="signup"?<><label>Display name<input minLength={2} maxLength={32} required value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your player name"/></label><label>Username<input minLength={3} maxLength={24} required value={username} onChange={(e)=>setUsername(normalizeUsername(e.target.value))} placeholder="your_username"/><span className="hint">Unique. Friends and tournament admins find you with this.</span></label></>:null}
    <label>Email<input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}/>{mode==="signup"?<span className="hint">Your email remains the verified account channel. During an active event it can be shown only to players you are paired against.</span>:null}</label>
    {mode==="signup"?<label>Israeli mobile number<input type="tel" inputMode="numeric" autoComplete="tel" maxLength={10} required value={phone} onChange={(e)=>setPhone(normalizeIsraeliPhone(e.target.value))} placeholder="0501234567"/><span className="hint">Must start with 05 and contain exactly 10 digits. No SMS confirmation is used. This number can be shown only to players you are paired against in an active tournament.</span></label>:null}
    <label>Password<input type="password" minLength={8} required value={password} onChange={(e)=>setPassword(e.target.value)}/></label>
    {mode==="signup"?<label className="legal-check"><input type="checkbox" checked={agreed} onChange={(e)=>setAgreed(e.target.checked)} required/><span>I agree to the <Link href="/terms" target="_blank">Terms of Service</Link> and acknowledge the <Link href="/privacy" target="_blank">Privacy Notice</Link>, including sharing my registered email address and phone number with players I am paired against for tournament coordination.</span></label>:null}
    <button className="primary" disabled={busy}>{busy?"Working…":mode==="login"?"Sign in":"Create account"}</button>
    {message?<div className="message">{message}</div>:null}
  </form><button className="nav-button auth-switch" onClick={()=>{setMode(mode==="login"?"signup":"login");setMessage("");setAgreed(false);setConfirmed(false);history.replaceState(null,"","/login")}}>{mode==="login"?"New here? Create an account":"Already have an account? Sign in"}</button></div>
}
