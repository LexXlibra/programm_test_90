import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getSession } from "@/server/http/session";
import { apiError } from "@/server/http/errors";

const schema=z.object({title:z.string().trim().min(1).max(120),isrc:z.string().trim().max(12).optional().or(z.literal("")),explicit:z.boolean()}).strict();
export async function PATCH(request:Request,{params}:{params:Promise<{id:string;trackId:string}>}){const session=await getSession();if(!session)return NextResponse.json({error:"Войдите в аккаунт."},{status:401});try{const {id,trackId}=await params;const input=schema.parse(await request.json());const release=await prisma.release.findUnique({where:{id},select:{ownerId:true,status:true,deletedAt:true}});if(!release||release.deletedAt)throw new Error("NOT_FOUND");if(release.ownerId!==session.user.id||!["DRAFT","CHANGES_REQUESTED"].includes(release.status))throw new Error("FORBIDDEN");const result=await prisma.$transaction(async(tx)=>{const updated=await tx.track.updateMany({where:{id:trackId,releaseId:id},data:{...input,isrc:input.isrc||null}});if(updated.count===0)throw new Error("NOT_FOUND");await tx.release.update({where:{id},data:{updatedBy:session.user.id}});await tx.auditLog.create({data:{actorId:session.user.id,action:"release.track_updated",entityType:"Track",entityId:trackId,metadata:{fields:Object.keys(input)}}});return {id:trackId,...input};});return NextResponse.json(result);}catch(error){return apiError(error);}}
