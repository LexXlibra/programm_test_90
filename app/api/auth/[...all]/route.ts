import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";
import { logger } from "@/server/logging/logger";

const handlers=toNextJsHandler(auth);
export const GET=handlers.GET;
export async function POST(request:Request){
  const path=new URL(request.url).pathname;
  const response=await handlers.POST(request);
  if(path.endsWith("/sign-in/email"))logger.info({success:response.ok,statusCode:response.status},response.ok?"Authentication succeeded":"Authentication failed");
  if(path.endsWith("/sign-up/email")&&response.ok)logger.info({success:true},"Account registered");
  if(path.endsWith("/sign-out")&&response.ok)logger.info({success:true},"User signed out");
  return response;
}
