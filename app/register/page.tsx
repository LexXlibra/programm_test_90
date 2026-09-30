"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter(); const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault();setBusy(true);setError("");try{const response=await fetch("/api/auth/sign-up/email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,email,password})});if(!response.ok){setError("Не удалось создать аккаунт. Возможно, этот email уже зарегистрирован.");return;}router.push("/");router.refresh();}catch{setError("Сервис временно недоступен. Попробуйте ещё раз.");}finally{setBusy(false);}}
  return <main className="auth-page"><Link href="/" prefetch={false} className="auth-back"><ArrowLeft size={14}/> NynetyDegrees</Link><section className="auth-card"><div className="auth-logo">90<span>°</span></div><div className="auth-eyebrow">ARTIST PORTAL</div><h1>Your next chapter.</h1><p>Create an account and bring your music to us.</p><form onSubmit={submit}><label>Full name<input autoComplete="name" required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label><label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" autoComplete="new-password" required minLength={10} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 10 characters"/></label>{error&&<div className="auth-error" role="alert">{error}</div>}<Button type="submit" disabled={busy} className="auth-submit">{busy?<LoaderCircle className="spin" size={15}/>:<>Create account <ArrowRight size={15}/></>}</Button></form><div className="auth-foot">Already have an account? <Link href="/login" prefetch={false}>Sign in</Link></div></section><div className="auth-legal">© 2026 NynetyDegrees Records</div></main>;
}
