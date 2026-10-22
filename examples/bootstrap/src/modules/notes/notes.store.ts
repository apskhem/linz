import { randomUUID } from "node:crypto";

import type { Note, NoteInput } from "./notes.schemas";

// Notes live in memory, so they are lost on restart. To use a database instead,
// reimplement these functions; the endpoints only depend on them.
const notes = new Map<string, Note>();

export const notesStore = {
  list(filter: { tag?: string | undefined; search?: string | undefined }): Note[] {
    return [...notes.values()].filter(
      (note) =>
        (!filter.tag || note.tags.includes(filter.tag)) &&
        (!filter.search || note.title.toLowerCase().includes(filter.search.toLowerCase()))
    );
  },

  get(id: string): Note | undefined {
    return notes.get(id);
  },

  create(input: NoteInput): Note {
    const note: Note = { id: randomUUID(), ...input, createdAt: new Date().toISOString() };
    notes.set(note.id, note);
    return note;
  },

  update(id: string, input: NoteInput): Note | undefined {
    const existing = notes.get(id);
    if (!existing) {
      return undefined;
    }

    const note: Note = { ...existing, ...input };
    notes.set(id, note);
    return note;
  },

  remove(id: string): boolean {
    return notes.delete(id);
  },
};
