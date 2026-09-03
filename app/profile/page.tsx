"use client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { PlayerProfile } from "@/components/PlayerProfile";
import { ensureProfile, supabase } from "@/lib/supabase";
export default function ProfilePage(){const [user,setUser]=useState<User|null|undefined>(undefined);useEffect(()=>{void supabase().auth.getUser().then(async({data})=>{if(data.user)await ensureProfile(data.user);setUser(data.user??null)})},[]);if(user===undefined)return <div className="empty">Loading profile…</div>;if(!user)return <div className="empty"><strong>Sign in to see your profile</strong><div style={{marginTop:18}}><a className="primary" href="/login">Sign in</a></div></div>;return <PlayerProfile playerId={user.id} editable/>}
