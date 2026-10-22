import type { oas3 } from "@apskhem/linz";

/**
 * Tags group related endpoints in the generated docs.
 */
export const TAGS = {
  health: { name: "Health", description: "Service status" },
  notes: { name: "Notes", description: "Create and manage notes" },
} satisfies Record<string, oas3.TagObject>;
