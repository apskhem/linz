import {
  ApiError,
  applyGroupConfig,
  endpoint,
  FormDataBody,
  HttpResponse,
  type LinzEndpointGroup,
} from "@apskhem/linz";
import { z } from "zod";

import { bearerAuth } from "../../common/security";
import { TAGS } from "../../common/tags";
import { ListNotesQuery, Note, NoteInput, NoteParams } from "./notes.schemas";
import { notesStore } from "./notes.store";

// Throwing an `ApiError` sends that status with a JSON:API error body.
// Any other error becomes a 500 with its details logged, never sent to clients.
const notFound = (id: string) =>
  new ApiError(404, { status: "404", detail: `Note ${id} not found` });

// Keys are `<method>:<path>`. Path parameters use `:name`.
const endpoints: LinzEndpointGroup = {
  "get:/notes": endpoint({
    operationId: "listNotes",
    summary: "List notes",
    parameters: { query: ListNotesQuery },
    responses: { 200: z.object({ items: z.array(Note) }) },
    // `queries`, `params`, `body`... are already validated and typed from the schemas
    handler: async ({ queries }) => ({ items: notesStore.list(queries) }),
  }),

  "get:/notes/:id": endpoint({
    operationId: "getNote",
    summary: "Get a note",
    parameters: { path: NoteParams },
    // a string documents an error response that the handler throws as an `ApiError`
    responses: { 200: Note, 404: "Note not found" },
    handler: async ({ params }) => {
      const note = notesStore.get(params.id);
      if (!note) {
        throw notFound(params.id);
      }
      return note;
    },
  }),

  "post:/notes": endpoint({
    operationId: "createNote",
    summary: "Create a note",
    // endpoints with `security` require it, the others are public
    security: [bearerAuth.apply([])],
    // a Zod schema is short for `new JsonBody(schema)`
    requestBody: NoteInput,
    // `post` responds 201 when it is defined, other methods 200
    responses: { 201: Note },
    handler: async ({ body }) => notesStore.create(body),
  }),

  "put:/notes/:id": endpoint({
    operationId: "updateNote",
    summary: "Replace a note",
    security: [bearerAuth.apply([])],
    parameters: { path: NoteParams },
    requestBody: NoteInput,
    responses: { 200: Note, 404: "Note not found" },
    handler: async ({ params, body }) => {
      const note = notesStore.update(params.id, body);
      if (!note) {
        throw notFound(params.id);
      }
      return note;
    },
  }),

  "delete:/notes/:id": endpoint({
    operationId: "deleteNote",
    summary: "Delete a note",
    security: [bearerAuth.apply([])],
    parameters: { path: NoteParams },
    responses: { 204: z.void(), 404: "Note not found" },
    handler: async ({ params }) => {
      if (!notesStore.remove(params.id)) {
        throw notFound(params.id);
      }
      // `HttpResponse` sets the status and headers explicitly
      return HttpResponse.withoutBody(204);
    },
  }),

  "post:/notes/:id/attachments": endpoint({
    operationId: "uploadAttachment",
    summary: "Attach a file to a note",
    security: [bearerAuth.apply([])],
    parameters: { path: NoteParams },
    // other body types: `UrlEncodedBody`, `TextBody`, `OctetStreamBody`
    requestBody: new FormDataBody(z.object({ file: z.instanceof(File) })),
    responses: {
      201: z.object({ name: z.string(), size: z.number(), type: z.string() }),
      404: "Note not found",
    },
    handler: async ({ params, body }) => {
      if (!notesStore.get(params.id)) {
        throw notFound(params.id);
      }
      // a real app would store the file (e.g. in object storage) and keep a reference to it
      return { name: body.file.name, size: body.file.size, type: body.file.type };
    },
  }),
};

// settings shared by every endpoint of this module
export const notesEndpoints = applyGroupConfig(endpoints, { tags: [TAGS.notes] });
