import { mergeEndpointGroups } from "@apskhem/linz";

import simpleController from "modules/simple/simple.controller";

export default mergeEndpointGroups("/v1", [
  simpleController
]);
