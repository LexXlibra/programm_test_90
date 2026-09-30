import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getSession } from "@/server/http/session";
import { apiError } from "@/server/http/errors";

const schema = z.object({ credits: z.array(z.object({ name: z.string().trim().min(1).max(120), role: z.enum(["MUSIC", "LYRICS", "PRODUCER"]) }).strict()).max(60) }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
  try {
    const { id } = await params; const input = schema.parse(await request.json());
    const release = await prisma.release.findUnique({ where: { id } });
    if (!release || release.deletedAt) throw new Error("NOT_FOUND");
    if (release.ownerId !== session.user.id || !["DRAFT", "CHANGES_REQUESTED"].includes(release.status)) throw new Error("FORBIDDEN");
    await prisma.$transaction(async (tx) => {
      await tx.contributor.deleteMany({ where: { releaseId: id, trackId: null } });
      if (input.credits.length) await tx.contributor.createMany({ data: input.credits.map((credit) => ({ releaseId: id, ...credit })) });
      await tx.auditLog.create({data:{actorId:session.user.id,action:"release.credits_updated",entityType:"Release",entityId:id,metadata:{creditCount:input.credits.length}}});
    });
    return NextResponse.json({ credits: input.credits.length }, { status: 201 });
  } catch (error) { return apiError(error); }
}
