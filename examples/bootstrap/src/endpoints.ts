import { type LinzEndpointGroup, mergeEndpointGroups } from "@apskhem/linz";

import { healthEndpoints } from "./modules/health/health.endpoints";
import { notesEndpoints } from "./modules/notes/notes.endpoints";

/**
 * Every endpoint of the API. Register new modules here.
 * `mergeEndpointGroups` adds a path prefix, so `get:/notes` is served at `GET /v1/notes`.
 */
export const endpoints: LinzEndpointGroup = {
  ...healthEndpoints,
  ...mergeEndpointGroups("/v1", [notesEndpoints]),
};
