"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      if (!response.ok) { setError("Не удалось войти. Проверьте email и пароль."); return; }
      router.push("/"); router.refresh();
    } catch { setError("Сервис временно недоступен. Попробуйте ещё раз."); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><Link href="/" prefetch={false} className="auth-back"><ArrowLeft size={14}/> NynetyDegrees</Link><section className="auth-card"><div className="auth-logo">90<span>°</span></div><div className="auth-eyebrow">ARTIST PORTAL</div><h1>Welcome back.</h1><p>Sign in to manage your releases.</p><form onSubmit={submit}><label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" autoComplete="current-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/></label>{error&&<div className="auth-error" role="alert">{error}</div>}<Button type="submit" disabled={busy} className="auth-submit">{busy?<LoaderCircle className="spin" size={15}/>:<>Continue <ArrowRight size={15}/></>}</Button></form><div className="auth-foot">New to the label? <Link href="/register" prefetch={false}>Create an account</Link></div></section><div className="auth-legal">© 2026 NynetyDegrees Records</div></main>;
}
