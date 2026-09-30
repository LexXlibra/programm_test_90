import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getSession } from "@/server/http/session";
import { apiError } from "@/server/http/errors";

const schema = z.object({ artists: z.array(z.object({ name: z.string().trim().min(1).max(120), role: z.enum(["PRIMARY", "FEATURING"]).default("PRIMARY") }).strict()).min(1).max(10) }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
  try {
    const { id } = await params; const input = schema.parse(await request.json());
    const release = await prisma.release.findUnique({ where: { id } });
    if (!release || release.deletedAt) throw new Error("NOT_FOUND");
    if (release.ownerId !== session.user.id || !["DRAFT", "CHANGES_REQUESTED"].includes(release.status)) throw new Error("FORBIDDEN");
    await prisma.$transaction(async (tx) => {
      await tx.releaseArtist.deleteMany({ where: { releaseId: id } });
      for (const item of input.artists) {
        const artist = await tx.artist.upsert({ where: { userId_name: { userId: session.user.id, name: item.name } }, create: { userId: session.user.id, name: item.name }, update: {} });
        await tx.releaseArtist.create({ data: { releaseId: id, artistId: artist.id, role: item.role } });
      }
      await tx.auditLog.create({data:{actorId:session.user.id,action:"release.artists_updated",entityType:"Release",entityId:id,metadata:{artistCount:input.artists.length}}});
    });
    return NextResponse.json({ artists: input.artists.length }, { status: 201 });
  } catch (error) { return apiError(error); }
}
