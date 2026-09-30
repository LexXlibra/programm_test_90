import { randomUUID } from "node:crypto";
import { hash } from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

const email=(process.env.ADMIN_EMAIL??"").trim().toLowerCase();
const name=(process.env.ADMIN_NAME??"").trim();
const password=process.env.ADMIN_PASSWORD??"";
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||name.length<2||name.length>80||password.length<14){
  console.error("Set a valid ADMIN_EMAIL, ADMIN_NAME, and a unique ADMIN_PASSWORD with at least 14 characters.");
  process.exit(2);
}
const prisma=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
try{
  const existing=await prisma.user.findUnique({where:{email},select:{id:true,role:true}});
  if(existing?.role==="ADMIN"){console.info("That account is already an admin; no changes made.");process.exit(0);}
  const actorId=existing?.id??randomUUID();
  const hashedPassword=existing?null:await hash(password,{type:2,memoryCost:19456,timeCost:2,parallelism:1});
  await prisma.$transaction(async(tx)=>{
    const admin=existing
      ? await tx.user.update({where:{id:existing.id},data:{role:"ADMIN"}})
      : await tx.user.create({data:{id:actorId,name,email,role:"ADMIN",emailVerified:true}});
    if(!existing)await tx.account.create({data:{userId:admin.id,accountId:admin.id,providerId:"credential",password:hashedPassword}});
    await tx.auditLog.create({data:{actorId:admin.id,action:existing?"user.role_changed":"admin.bootstrapped",entityType:"User",entityId:admin.id,metadata:{to:"ADMIN",...(existing?{from:existing.role}:{})}}});
  });
  console.info(existing?"Existing account promoted to admin.":"Admin account created.");
}finally{await prisma.$disconnect();}
