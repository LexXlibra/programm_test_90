import type { StorageProvider } from "./provider";
import { LocalStorageProvider } from "./local-provider";

export const storage: StorageProvider = new LocalStorageProvider();
