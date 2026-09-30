import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getSession } from "@/server/http/session";
import { apiError } from "@/server/http/errors";
import { assertReleaseTransition } from "@/server/services/release-workflow";
import { logger } from "@/server/logging/logger";
import { asRole } from "@/server/auth/role";
import { enforceRateLimit } from "@/server/http/rate-limit";

const inputSchema = z.object({ status: z.enum(["DRAFT", "SUBMITTED", "IN_REVIEW", "CHANGES_REQUESTED", "RESUBMITTED", "APPROVED", "READY_FOR_DISTRIBUTION", "DISTRIBUTED", "SCHEDULED", "RELEASED", "REJECTED"]), note: z.string().trim().max(2000).optional() }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
  const limited=enforceRateLimit(session.user.id,"release-status",30);if(limited)return limited;
  try {
    const { id } = await params;
    const { status, note } = inputSchema.parse(await request.json());
    const result = await prisma.$transaction(async (tx) => {
      const release = await tx.release.findUnique({ where: { id } });
      if (!release || release.deletedAt) throw new Error("NOT_FOUND");
      if (session.user.role === "USER" && release.ownerId !== session.user.id) throw new Error("FORBIDDEN");
      assertReleaseTransition(release.status, status, asRole(session.user.role));
      if (status === "CHANGES_REQUESTED" && !note?.trim()) throw new Error("CHANGE_NOTE_REQUIRED");
      if(status==="SUBMITTED"||status==="RESUBMITTED"){
        const complete=await tx.release.findUnique({where:{id},select:{artwork:{select:{id:true}},artists:{where:{role:"PRIMARY"},select:{artistId:true},take:1},tracks:{select:{audioFile:{select:{id:true}}}}}});
        if(!complete?.artwork||complete.artists.length===0||complete.tracks.length===0||complete.tracks.some(track=>!track.audioFile))throw new Error("RELEASE_INCOMPLETE");
      }
      const updated = await tx.release.update({ where: { id }, data: { status, updatedBy: session.user.id } });
      await tx.releaseStatusHistory.create({ data: { releaseId: id, actorId: session.user.id, fromStatus: release.status, toStatus: status, note } });
      if (note) await tx.releaseComment.create({ data: { releaseId: id, authorId: session.user.id, body: note } });
      await tx.auditLog.create({ data: { actorId: session.user.id, action: "release.status_changed", entityType: "Release", entityId: id, metadata: { from: release.status, to: status } } });
      return updated;
    });
    logger.info({ userId: session.user.id, releaseId: result.id, status }, "Release status changed");
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "CHANGE_NOTE_REQUIRED") return NextResponse.json({ error: "Добавьте комментарий с необходимыми исправлениями." }, { status: 400 });
    return apiError(error);
  }
}
