import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiError(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: "Проверьте заполненные поля." }, { status: 400 });
  const message = error instanceof Error ? error.message : "";
  if (message === "FORBIDDEN") return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
  if (message === "NOT_FOUND") return NextResponse.json({ error: "Релиз не найден." }, { status: 404 });
  if (message === "INVALID_RELEASE_TRANSITION") return NextResponse.json({ error: "Этот переход статуса запрещён." }, { status: 409 });
  if (message === "CHANGE_NOTE_REQUIRED") return NextResponse.json({ error: "Добавьте комментарий с необходимыми исправлениями." }, { status: 400 });
  if (message === "RELEASE_INCOMPLETE") return NextResponse.json({ error: "Добавьте артиста, обложку и аудиофайлы ко всем трекам." }, { status: 400 });
  if (message === "FILE_TOO_LARGE") return NextResponse.json({ error: "Файл превышает допустимый размер." }, { status: 413 });
  return NextResponse.json({ error: "Не удалось выполнить запрос." }, { status: 500 });
}

export function jsonSafe(data: unknown, init?: ResponseInit) {
  const body = JSON.stringify(data, (_key, value: unknown) => typeof value === "bigint" ? Number(value) : value);
  return new Response(body, { ...init, headers: { "Content-Type": "application/json; charset=utf-8", ...init?.headers } });
}
