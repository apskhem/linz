import type * as http from "http";

import { z } from "zod";

export type JsonApiErrorItem = {
  id?: string;
  links?: {
    about?: string;
  };
  status?: string;
  code?: string;
  title?: string;
  detail?: string;
  source?: {
    pointer?: string;
    parameter?: string;
    header?: string;
  };
  meta?: Record<string, any>;
};

export type JsonApiErrorResponse = {
  errors: JsonApiErrorItem[];
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errors: JsonApiErrorItem | JsonApiErrorItem[],
    public readonly headers?: http.OutgoingHttpHeaders
  ) {
    super();
  }
}

/**
 * The documented shape of every error response, matching `JsonApiErrorResponse`.
 */
const jsonApiErrorItemSchema = z
  .object({
    id: z
      .string()
      .optional()
      .describe("A unique identifier for this particular occurrence of the problem."),
    links: z
      .object({
        about: z
          .string()
          .url()
          .optional()
          .describe("A link that leads to further details about this particular error."),
      })
      .optional()
      .describe("Links that lead to further details about the error."),
    status: z
      .string()
      .optional()
      .describe("HTTP status code applicable to this error, represented as a string."),
    code: z
      .string()
      .optional()
      .describe("An application-specific error code identifying the type of error."),
    title: z
      .string()
      .optional()
      .describe(
        "A short, human-readable summary of the problem that should not change from occurrence to occurrence."
      ),
    detail: z
      .string()
      .optional()
      .describe("A human-readable explanation specific to this occurrence of the problem."),
    source: z
      .object({
        pointer: z
          .string()
          .optional()
          .describe(
            "JSON Pointer to the request entity where the error originated (e.g., /data/attributes/email)."
          ),
        parameter: z
          .string()
          .optional()
          .describe("Query parameter name that caused the error (e.g., 'sort')."),
        header: z
          .string()
          .optional()
          .describe(
            "A string indicating the name of a single request header which caused the error."
          ),
      })
      .optional()
      .describe("An object containing references to the source of the error."),
    meta: z
      .record(z.string(), z.any())
      .optional()
      .describe("A meta object containing non-standard, implementation-specific details."),
  })
  .describe("A single error object conforming to JSON:API specification.");

export const jsonApiErrorResponseSchema = z
  .object({
    errors: z.array(jsonApiErrorItemSchema).describe("Array of JSON:API error objects."),
  })
  .describe("JSON:API error response object.");
