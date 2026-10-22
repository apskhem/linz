import type { Router } from "@routejs/router";
import { type LinzEndpointGroup } from "../endpoint";
import type { CreateApiConfig } from "./config";
export declare function createApi(app: Router, endpoints: LinzEndpointGroup, config?: Partial<CreateApiConfig>): void;
