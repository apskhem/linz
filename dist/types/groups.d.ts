import type { LinzEndpoint, LinzEndpointGroup } from "./endpoint";
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
export declare function mergeEndpointGroups(prefix: string, groups: LinzEndpointGroup[]): LinzEndpointGroup;
/**
 * Applies a common configuration to all endpoints within a given group of `LinzEndpoint`.
 * The function merges the provided configuration (`tags` and `security`) with each endpoint's
 * existing configuration. The given group is left untouched, and applying the same tag or
 * security more than once does not duplicate it.
 *
 * @param {LinzEndpointGroup} group - A group of endpoints, where each endpoint has its own configuration.
 * @param {Object} config - An object containing common configuration options to apply to each endpoint.
 *
 * @returns {LinzEndpointGroup} - A new group of endpoints with the merged configuration for each endpoint.
 */
export declare function applyGroupConfig(group: LinzEndpointGroup, config: Partial<Pick<LinzEndpoint, "tags" | "security" | "hidden" | "deprecated">>): LinzEndpointGroup;
