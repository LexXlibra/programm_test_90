"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignOutButton(){const router=useRouter();const[busy,setBusy]=useState(false);async function signOut(){setBusy(true);await fetch("/api/auth/sign-out",{method:"POST"});router.push("/login");router.refresh();}return <button className="subtle-button" disabled={busy} onClick={signOut}>{busy?"Signing out…":"Sign out"}</button>;}
