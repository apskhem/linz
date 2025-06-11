import { mapKeys, mapValues } from "radash";

import { cleanPath } from "./internal/utils";

import { LinzEndpoint, LinzEndpointGroup } from ".";

/**
 * Merges multiple endpoint groups into a single group, applying a prefix to all keys.
 * This function ensures that no duplicate keys are present across the groups,
 * and throws an error if duplication occurs. It returns the merged group with the prefixed keys.
 *
 * @param {string} prefix - A string prefix to prepend to each endpoint key in the groups.
 * @param {LinzEndpointGroup[]} groups - An array of endpoint groups to be merged. Each group is a map of endpoint keys to configurations.
 *
 * @returns {LinzEndpointGroup} - A single merged endpoint group with prefixed keys. All keys are cleaned using `cleanPath`,
 *                                and any keys with collisions are reported as an error.
 *
 * @throws {Error} Throws an error if duplicate keys are found after applying the prefix to the groups.
 */
export function mergeEndpointGroups(
  prefix: string,
  groups: LinzEndpointGroup[]
): LinzEndpointGroup {
  const readPaths: string[] = [];
  const dupPaths: string[] = [];

  for (const group of groups) {
    const paths = Object.keys(group).map((path) => cleanPath(`${prefix}${path}`));

    dupPaths.push(...readPaths.filter((k) => paths.includes(k)));
    readPaths.push(...paths);
  }

  if (dupPaths.length) {
    throw new Error(`Duplicated keys occured: ${dupPaths.join(", ")}`);
  }

  return mapKeys(Object.assign({}, ...groups), (k: string) =>
    cleanPath(k.replace(/:/, `:${prefix}`))
  );
}

/**
 * Applies a common configuration to all endpoints within a given group of `LinzEndpoint`.
 * The function merges the provided configuration (`tags` and `security`) with each endpoint's
 * existing configuration.
 *
 * @param {LinzEndpointGroup} group - A group of endpoints, where each endpoint has its own configuration.
 * @param {Object} config - An object containing common configuration options to apply to each endpoint.
 *
 * @returns {LinzEndpointGroup} - A new group of endpoints with the merged configuration for each endpoint.
 */
export function applyGroupConfig(
  group: LinzEndpointGroup,
  config: Partial<Pick<LinzEndpoint, "tags" | "security" | "hidden" | "deprecated">>
): LinzEndpointGroup {
  return mapValues(group, (endpoint) => {
    if (config.tags) {
      endpoint.tags ? endpoint.tags.push(...config.tags) : (endpoint.tags = config.tags.slice());
    }
    if (config.security) {
      endpoint.security
        ? endpoint.security.push(...config.security)
        : (endpoint.security = config.security.slice());
    }
    if (typeof config.hidden !== "undefined" && typeof endpoint.hidden === "undefined") {
      endpoint.hidden = config.hidden;
    }
    if (typeof config.deprecated !== "undefined" && typeof endpoint.deprecated === "undefined") {
      endpoint.deprecated = config.deprecated;
    }

    return endpoint;
  });
}
