import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getSession } from "@/server/http/session";
import SignOutButton from "./sign-out-button";

export default async function SettingsPage(){const session=await getSession();if(!session)redirect("/login");return <main className="subpage"><header className="subpage-head"><Link href="/" className="wizard-back"><ArrowLeft size={14}/> Overview</Link></header><div className="settings-content"><div className="section-kicker">YOUR ACCOUNT</div><h1>Settings</h1><p className="subpage-intro">Manage your profile and session.</p><section className="detail-card account-card"><div className="account-avatar">{session.user.name.slice(0,2).toUpperCase()}</div><div className="account-row"><span>Name</span><b>{session.user.name}</b></div><div className="account-row"><span>Email</span><b>{session.user.email}</b></div><div className="account-row"><span>Role</span><b>{session.user.role}</b></div><div className="account-row"><span>Session security</span><b><ShieldCheck size={14}/> HTTP-only cookie</b></div><div className="account-actions"><SignOutButton/></div></section></div></main>}
