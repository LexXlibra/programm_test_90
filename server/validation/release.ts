import { z } from "zod";

export const releaseDraftSchema = z.object({
  title: z.string().trim().min(1).max(120),
  type: z.enum(["SINGLE", "EP", "ALBUM"]),
  genre: z.string().trim().max(60).optional().or(z.literal("")),
  language: z.string().trim().max(40).optional().or(z.literal("")),
  explicit: z.boolean().default(false),
  desiredDate: z.string().date().optional().or(z.literal("")),
}).strict();

export const commentSchema = z.object({ body: z.string().trim().min(1).max(2000) }).strict();
