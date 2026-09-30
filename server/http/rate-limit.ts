import { NextResponse } from "next/server";
import { isRateLimited } from "@/server/security/rate-limit";

export function enforceRateLimit(identity:string,scope:string,limit:number,windowMs=60_000){
  if(!isRateLimited(`${scope}:${identity}`,limit,windowMs))return null;
  return NextResponse.json({error:"Слишком много запросов. Попробуйте позже."},{status:429,headers:{"Retry-After":String(Math.ceil(windowMs/1000)),"Cache-Control":"no-store"}});
}
