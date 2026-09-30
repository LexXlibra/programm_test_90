import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getSession } from "@/server/http/session";
import { apiError, jsonSafe } from "@/server/http/errors";
import { releaseDraftSchema } from "@/server/validation/release";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
  const { id } = await params;
  const release = await prisma.release.findUnique({ where: { id }, include: { owner: { select: { name: true, email: true } }, artists: { include: { artist: true } }, tracks: { include: { artists: { include: { artist: true } }, contributors: true, audioFile: true }, orderBy: { trackNumber: "asc" } }, contributors: true, artwork: true, comments: { include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: "asc" } }, statusHistory: { include: { actor: { select: { name: true, role: true } } }, orderBy: { createdAt: "asc" } } } });
  if (!release || release.deletedAt) return NextResponse.json({ error: "Релиз не найден." }, { status: 404 });
  if (session.user.role === "USER" && session.user.id !== release.ownerId) return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
  return jsonSafe(release);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
  try {
    const { id } = await params;
    const input = releaseDraftSchema.partial().refine((value)=>Object.keys(value).length>0).parse(await request.json());
    const release = await prisma.release.findUnique({ where: { id } });
    if (!release || release.deletedAt) throw new Error("NOT_FOUND");
    if (release.ownerId !== session.user.id || !["DRAFT", "CHANGES_REQUESTED"].includes(release.status)) throw new Error("FORBIDDEN");
    const updated=await prisma.$transaction(async(tx)=>{
      const result=await tx.release.update({ where: { id }, data: {
        ...input, genre: input.genre || null, language: input.language || null,
        desiredDate: input.desiredDate ? new Date(`${input.desiredDate}T12:00:00.000Z`) : input.desiredDate === "" ? null : undefined,
        updatedBy: session.user.id,
      } });
      await tx.auditLog.create({data:{actorId:session.user.id,action:"release.updated",entityType:"Release",entityId:id,metadata:{fields:Object.keys(input)}}});
      return result;
    });
    return NextResponse.json(updated);
  } catch (error) { return apiError(error); }
}

const tracksSchema = z.object({ tracks: z.array(z.object({ title: z.string().trim().min(1).max(120), isrc: z.string().trim().max(12).optional().or(z.literal("")), explicit: z.boolean().default(false) }).strict()).min(1).max(30) }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
  try {
    const { id } = await params;
    const input = tracksSchema.parse(await request.json());
    const release = await prisma.release.findUnique({ where: { id } });
    if (!release || release.deletedAt) throw new Error("NOT_FOUND");
    if (release.ownerId !== session.user.id || !["DRAFT", "CHANGES_REQUESTED"].includes(release.status)) throw new Error("FORBIDDEN");
    await prisma.$transaction(async (tx) => {
      for(const [index,track] of input.tracks.entries()){
        await tx.track.upsert({
          where:{releaseId_trackNumber:{releaseId:id,trackNumber:index+1}},
          create:{releaseId:id,title:track.title,trackNumber:index+1,isrc:track.isrc||null,explicit:track.explicit},
          update:{title:track.title,isrc:track.isrc||null,explicit:track.explicit},
        });
      }
      await tx.release.update({ where: { id }, data: { updatedBy: session.user.id } });
      await tx.auditLog.create({data:{actorId:session.user.id,action:"release.tracks_updated",entityType:"Release",entityId:id,metadata:{trackCount:input.tracks.length}}});
    });
    return NextResponse.json({ tracks: input.tracks.length }, { status: 201 });
  } catch (error) { return apiError(error); }
}
