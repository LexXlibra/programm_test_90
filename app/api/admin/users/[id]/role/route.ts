import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/server/http/session";
import { prisma } from "@/server/db/client";
import { enforceRateLimit } from "@/server/http/rate-limit";

const schema=z.object({role:z.enum(["USER","MANAGER","ADMIN"])}).strict();
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){const session=await getSession();if(!session)return NextResponse.json({error:"Войдите в аккаунт."},{status:401});if(session.user.role!=="ADMIN")return NextResponse.json({error:"Недостаточно прав."},{status:403});const limited=enforceRateLimit(session.user.id,"admin-role",30);if(limited)return limited;const {id}=await params;if(id===session.user.id)return NextResponse.json({error:"Нельзя изменить собственную роль."},{status:409});const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Выберите корректную роль."},{status:400});const target=await prisma.user.findUnique({where:{id},select:{id:true,email:true,role:true}});if(!target)return NextResponse.json({error:"Пользователь не найден."},{status:404});await prisma.$transaction([prisma.user.update({where:{id},data:{role:parsed.data.role}}),prisma.auditLog.create({data:{actorId:session.user.id,action:"user.role_changed",entityType:"User",entityId:id,metadata:{from:target.role,to:parsed.data.role}}})]);return NextResponse.json({id,role:parsed.data.role});}
