import { createWriteStream, createReadStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import type { StorageProvider, StoredObject } from "./provider";

export class LocalStorageProvider implements StorageProvider {
  private readonly root = resolve(process.env.STORAGE_PATH ?? "./storage/releases");

  private resolveKey(key: string): string {
    if (!/^[a-f0-9-]{36}\.(?:wav|flac|jpg|jpeg|png)$/i.test(key)) throw new Error("INVALID_STORAGE_KEY");
    const target = resolve(this.root, key);
    if (!target.startsWith(this.root + sep)) throw new Error("INVALID_STORAGE_KEY");
    return target;
  }

  async put(stream: Readable, key: string, maxBytes: number): Promise<StoredObject> {
    const target = this.resolveKey(key);
    await mkdir(this.root, { recursive: true });
    let size = 0;
    stream.on("data", (chunk: Buffer) => { size += chunk.length; if (size > maxBytes) stream.destroy(new Error("FILE_TOO_LARGE")); });
    try {
      await pipeline(stream, createWriteStream(target, { flags: "wx", mode: 0o600 }));
    } catch (error) {
      await rm(target, { force: true });
      throw error;
    }
    return { key, size };
  }

  async get(key: string): Promise<Readable> {
    const path = this.resolveKey(key);
    await stat(path);
    return createReadStream(path);
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }
}
