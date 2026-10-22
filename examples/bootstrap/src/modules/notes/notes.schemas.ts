import { z } from "zod";

// These schemas validate requests and responses at runtime, type the handlers,
// and are turned into the OpenAPI document. `.describe()` text shows up in the docs.

export const Note = z.object({
  id: z.string().describe("Unique identifier"),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  createdAt: z.iso.datetime(),
});
export type Note = z.infer<typeof Note>;

export const NoteInput = z.object({
  title: z.string().min(1).max(200),
  content: z.string().default(""),
  tags: z.array(z.string()).default([]),
});
export type NoteInput = z.infer<typeof NoteInput>;

export const NoteParams = z.object({
  id: z.string(),
});

export const ListNotesQuery = z.object({
  tag: z.string().optional().describe("Only notes with this tag"),
  search: z.string().optional().describe("Only notes whose title contains this text"),
});
