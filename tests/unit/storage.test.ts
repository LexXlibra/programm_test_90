import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import { LocalStorageProvider } from "@/server/storage/local-provider";

let root: string;
afterEach(async () => { if (root) await rm(root, { recursive: true, force: true }); });

describe("local storage provider", () => {
  it("stores, retrieves and deletes objects by opaque key", async () => {
    root = await mkdtemp(join(tmpdir(), "nynety-storage-"));
    process.env.STORAGE_PATH = root;
    const provider = new LocalStorageProvider();
    const key = `${randomUUID()}.wav`;
    const bytes = Buffer.from("release-audio");
    await provider.put(Readable.from(bytes), key, 100);
    const stored = await provider.get(key);
    const chunks: Buffer[] = [];
    for await (const chunk of stored) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks).equals(bytes)).toBe(true);
    await provider.delete(key);
    await expect(provider.get(key)).rejects.toThrow();
  });

  it("rejects path traversal and keys without a valid internal name", async () => {
    root = await mkdtemp(join(tmpdir(), "nynety-storage-"));
    process.env.STORAGE_PATH = root;
    const provider = new LocalStorageProvider();
    await expect(provider.get("../../secrets.txt")).rejects.toThrow("INVALID_STORAGE_KEY");
  });
});
