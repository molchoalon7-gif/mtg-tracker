"use client";
import { useParams } from "next/navigation";
import { PlayerProfile } from "@/components/PlayerProfile";
export default function PublicPlayerPage(){const {id}=useParams<{id:string}>();return <PlayerProfile playerId={id}/>}
