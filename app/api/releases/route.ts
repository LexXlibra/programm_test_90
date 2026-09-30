import { NextResponse } from "next/server";
import { getSession } from "@/server/http/session";
import { apiError, jsonSafe } from "@/server/http/errors";
import { prisma } from "@/server/db/client";
import { releaseDraftSchema } from "@/server/validation/release";
import { logger } from "@/server/logging/logger";
import { enforceRateLimit } from "@/server/http/rate-limit";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
  const limited=enforceRateLimit(session.user.id,"release-list",60);if(limited)return limited;
  const role = session.user.role;
  const releases = await prisma.release.findMany({
    where: { deletedAt: null, ...(role === "ADMIN" || role === "MANAGER" ? {} : { ownerId: session.user.id }) },
    include: { artists: { include: { artist: true } }, artwork: true, tracks: { orderBy: { trackNumber: "asc" } }, comments: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  });
  return jsonSafe(releases);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
  const limited=enforceRateLimit(session.user.id,"release-create",10);if(limited)return limited;
  try {
    const input = releaseDraftSchema.parse(await request.json());
    const release = await prisma.$transaction(async(tx)=>{
      const created=await tx.release.create({ data: {
        title: input.title, type: input.type, genre: input.genre || null, language: input.language || null,
        explicit: input.explicit, desiredDate: input.desiredDate ? new Date(`${input.desiredDate}T12:00:00.000Z`) : null,
        ownerId: session.user.id, createdBy: session.user.id,
        statusHistory: { create: { actorId: session.user.id, toStatus: "DRAFT" } },
      } });
      await tx.auditLog.create({ data: { actorId: session.user.id, action: "release.created", entityType: "Release", entityId: created.id } });
      return created;
    });
    logger.info({ userId: session.user.id, releaseId: release.id }, "Release created");
    return NextResponse.json(release, { status: 201 });
  } catch (error) { return apiError(error); }
}
