import type { Readable } from "node:stream";

export type StoredObject = { key: string; size: number };

export interface StorageProvider {
  put(stream: Readable, key: string, maxBytes: number): Promise<StoredObject>;
  get(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
}
