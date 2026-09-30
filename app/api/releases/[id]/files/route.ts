import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { storage } from "@/server/storage";
import { getSession } from "@/server/http/session";
import { apiError } from "@/server/http/errors";
import { canAccessRelease } from "@/server/permissions/rbac";
import { logger } from "@/server/logging/logger";
import { asRole } from "@/server/auth/role";
import { enforceRateLimit } from "@/server/http/rate-limit";

export const runtime = "nodejs";
const limitBytes = (name: "MAX_AUDIO_FILE_SIZE_MB" | "MAX_ARTWORK_FILE_SIZE_MB") => Number(process.env[name] ?? (name === "MAX_AUDIO_FILE_SIZE_MB" ? "250" : "20")) * 1024 * 1024;
const cleanName = (name: string) => name.replace(/[\r\n"\\]/g, "_").slice(0, 180);

function isSignatureValid(kind: string, extension: string, data: Buffer) {
  if (kind === "audio") {
    if (extension === ".wav") return data.length > 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WAVE";
    return extension === ".flac" && data.subarray(0, 4).toString("ascii") === "fLaC";
  }
  if (extension === ".png") return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (extension === ".jpg" || extension === ".jpeg") return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  return false;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
  const limited=enforceRateLimit(session.user.id,"file-upload",15);if(limited)return limited;
  const { id } = await params;
  try {
    const declaredLength=Number(request.headers.get("content-length")??0);
    const maxRequestBytes=Math.max(limitBytes("MAX_AUDIO_FILE_SIZE_MB"),limitBytes("MAX_ARTWORK_FILE_SIZE_MB"))+1024*1024;
    if(!Number.isSafeInteger(declaredLength)||declaredLength<=0||declaredLength>maxRequestBytes)return NextResponse.json({error:"Некорректный размер запроса."},{status:413});
    const release = await prisma.release.findUnique({ where: { id } });
    if (!release || release.deletedAt) throw new Error("NOT_FOUND");
    const role=asRole(session.user.role);
    if (!canAccessRelease(role, release.ownerId, session.user.id)) throw new Error("FORBIDDEN");
    if (!["DRAFT", "CHANGES_REQUESTED"].includes(release.status) && !["ADMIN", "MANAGER"].includes(session.user.role)) throw new Error("FORBIDDEN");
    const form = await request.formData();
    const file = form.get("file");
    const kind = form.get("kind");
    if (!(file instanceof File) || (kind !== "audio" && kind !== "artwork")) return NextResponse.json({ error: "Выберите корректный файл." }, { status: 400 });
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    const rules = kind === "audio"
      ? { extensions: [".wav", ".flac"], types: { ".wav": ["audio/wav", "audio/x-wav", "audio/wave"], ".flac": ["audio/flac", "audio/x-flac"] }, max: limitBytes("MAX_AUDIO_FILE_SIZE_MB") }
      : { extensions: [".jpg", ".jpeg", ".png"], types: { ".jpg": ["image/jpeg"], ".jpeg": ["image/jpeg"], ".png": ["image/png"] }, max: limitBytes("MAX_ARTWORK_FILE_SIZE_MB") };
    if (!rules.extensions.includes(extension) || file.size < 1 || file.size > rules.max || !(rules.types[extension as keyof typeof rules.types] as string[]).includes(file.type)) return NextResponse.json({ error: "Формат или размер файла не поддерживается." }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!isSignatureValid(kind, extension, bytes)) return NextResponse.json({ error: "Сигнатура файла не соответствует выбранному формату." }, { status: 400 });
    let trackId: string | undefined;
    if (kind === "audio") {
      trackId = String(form.get("trackId") ?? "");
      const track = await prisma.track.findFirst({ where: { id: trackId, releaseId: id } });
      if (!track) return NextResponse.json({ error: "Трек не найден." }, { status: 404 });
    }
    const key = `${randomUUID()}${extension}`;
    await storage.put(Readable.from(bytes), key, rules.max);
    let previousKey:string|undefined;
    try {
      previousKey=await prisma.$transaction(async(tx)=>{
        const previous=kind==="artwork"
          ?await tx.artwork.findUnique({where:{releaseId:id}})
          :await tx.audioFile.findUnique({where:{trackId:trackId!}});
        if(kind==="artwork")await tx.artwork.upsert({where:{releaseId:id},create:{releaseId:id,storageKey:key,originalName:cleanName(file.name),mimeType:file.type,sizeBytes:BigInt(bytes.length)},update:{storageKey:key,originalName:cleanName(file.name),mimeType:file.type,sizeBytes:BigInt(bytes.length)}});
        else await tx.audioFile.upsert({where:{trackId:trackId!},create:{releaseId:id,trackId:trackId!,storageKey:key,originalName:cleanName(file.name),mimeType:file.type,sizeBytes:BigInt(bytes.length)},update:{storageKey:key,originalName:cleanName(file.name),mimeType:file.type,sizeBytes:BigInt(bytes.length)}});
        await tx.auditLog.create({data:{actorId:session.user.id,action:"file.uploaded",entityType:kind==="artwork"?"Artwork":"AudioFile",entityId:id,metadata:{fileName:cleanName(file.name),bytes:bytes.length}}});
        return previous?.storageKey;
      });
      if(previousKey)await storage.delete(previousKey);
    } catch (error) { await storage.delete(key); throw error; }
    logger.info({ userId: session.user.id, releaseId: id, kind, bytes: bytes.length }, "Release file uploaded");
    return NextResponse.json({ name: cleanName(file.name), size: bytes.length, mimeType: file.type }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
  const { id } = await params;
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const trackId = url.searchParams.get("trackId");
  const release = await prisma.release.findUnique({ where: { id }, include: { artwork: true } });
  if (!release || release.deletedAt) return NextResponse.json({ error: "Релиз не найден." }, { status: 404 });
  if (!canAccessRelease(asRole(session.user.role), release.ownerId, session.user.id)) return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
  const asset = kind === "artwork" ? release.artwork : kind === "audio" && trackId ? await prisma.audioFile.findFirst({ where: { releaseId: id, trackId } }) : null;
  if (!asset) return NextResponse.json({ error: "Файл не найден." }, { status: 404 });
  const stream = await storage.get(asset.storageKey);
  return new Response(Readable.toWeb(stream) as ReadableStream, { headers: { "Content-Type": asset.mimeType, "Content-Disposition": `inline; filename="${cleanName(asset.originalName)}"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } });
}
