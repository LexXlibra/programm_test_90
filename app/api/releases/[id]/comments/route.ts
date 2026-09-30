import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getSession } from "@/server/http/session";
import { apiError } from "@/server/http/errors";
import { commentSchema } from "@/server/validation/release";
import { enforceRateLimit } from "@/server/http/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
  const limited=enforceRateLimit(session.user.id,"release-comments",30);if(limited)return limited;
  try {
    const { id } = await params;
    const { body } = commentSchema.parse(await request.json());
    const release = await prisma.release.findUnique({ where: { id }, select: { ownerId: true, deletedAt: true } });
    if (!release || release.deletedAt) throw new Error("NOT_FOUND");
    if (session.user.role === "USER" && session.user.id !== release.ownerId) throw new Error("FORBIDDEN");
    const comment = await prisma.$transaction(async(tx)=>{
      const created=await tx.releaseComment.create({ data: { releaseId: id, authorId: session.user.id, body }, include: { author: { select: { name: true, role: true } } } });
      await tx.auditLog.create({ data: { actorId: session.user.id, action: "release.comment_added", entityType: "Release", entityId: id } });
      return created;
    });
    return NextResponse.json(comment, { status: 201 });
  } catch (error) { return apiError(error); }
}
