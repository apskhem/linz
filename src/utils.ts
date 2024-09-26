import { Request } from "express";
import { compact, intersection, isEmpty, mapKeys, mapValues, merge } from "lodash";

import { HTTPRequest, LinzEndpoint, LinzEndpointGroup, ValidationError } from ".";

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
  const readKeys = [] as string[];

  for (const group of groups) {
    const keys = Object.keys(group).map((key) => cleanPath(`${prefix}${key}`));

    const dupKeys = intersection(readKeys, keys);
    if (dupKeys.length) {
      throw new Error(`Duplication keys occured: ${dupKeys.join(", ")}`);
    }

    readKeys.push(...keys);
  }

  return mapKeys(merge({}, ...groups), (v, k) => cleanPath(k.replace(/:/, `:${prefix}`)));
}

/**
 * Applies a common configuration to all endpoints within a given group of `LinzEndpoint`.
 * The function merges the provided configuration (`tags` and `security`) with each endpoint's
 * existing configuration.
 *
 * @param {LinzEndpointGroup} group - A group of endpoints, where each endpoint has its own configuration.
 * @param {Object} config - An object containing common configuration options to apply to each endpoint.
 * @param {LinzEndpoint["tags"]} [config.tags] - Optional tags to apply to each endpoint in the group.
 * @param {LinzEndpoint["security"]} [config.security] - Optional security configuration to apply to each endpoint in the group.
 *
 * @returns {LinzEndpointGroup} - A new group of endpoints with the merged configuration for each endpoint.
 */
export function applyGroupConfig(
  group: LinzEndpointGroup,
  config: {
    tags?: LinzEndpoint["tags"];
    security?: LinzEndpoint["security"];
  }
): LinzEndpointGroup {
  return mapValues(group, (v) => ({ ...config, ...v }));
}

/**
 * Formats and validates an Express.js request object using a specified validator.
 * This function attempts to parse and validate the `body`, `query`, `params`, `headers`,
 * and `cookies` of the request using the `LinzEndpoint` validator. If any parsing
 * fails, it catches the error, populates the corresponding error, and throws a `ValidationError`
 * with detailed validation information.
 *
 * @param {Request} req - The Express.js request object that contains the incoming HTTP request data.
 * @param {LinzEndpoint} validator - An object used to validate different parts of the request, including
 *                                   body, query parameters, path parameters, headers, and cookies.
 *
 * @returns {Readonly<HTTPRequest>} An immutable HTTPRequest object containing validated and formatted
 *                                  `body`, `queries`, `params`, `headers`, and `cookies`.
 *                                  - `body`: The validated request body or `null` if not present.
 *                                  - `queries`: The validated query parameters as a key-value object.
 *                                  - `params`: The validated path parameters as a key-value object.
 *                                  - `headers`: The validated request headers as a key-value object.
 *                                  - `cookies`: The validated request cookies as a key-value object.
 *
 * @throws {ValidationError} Throws a `ValidationError` if any part of the request (body, queries, params, headers, or cookies)
 *                           fails validation. The error will contain detailed information about which parts failed and why.
 *
 * @example
 * const validator = {
 *   requestBody: z.object({ name: z.string() }),
 *   parameters: {
 *     query: z.object({ age: z.number() }),
 *     path: z.object({ id: z.string() }),
 *     header: z.object({ authorization: z.string() }),
 *     cookie: z.object({ sessionId: z.string() })
 *   }
 * };
 *
 * try {
 *   const formattedRequest = formatExpressReq(req, validator);
 *   console.log(formattedRequest.body);  // Parsed and validated body
 *   console.log(formattedRequest.queries);  // Parsed and validated query parameters
 * } catch (err) {
 *   if (err instanceof ValidationError) {
 *     console.error(err.errors);  // Detailed validation errors
 *   }
 * }
 */
export function formatExpressReq(req: Request, validator: LinzEndpoint): Readonly<HTTPRequest> {
  const errors = {} as ConstructorParameters<typeof ValidationError>[0];

  const body = tryCatch(
    () => validator.requestBody?.parse(req.body) || req.body,
    (err: any) => (errors["body"] = JSON.parse(err.message))
  );
  const queries = tryCatch(
    () => validator.parameters?.query?.parse(req.query) || req.query,
    (err: any) => (errors["queries"] = JSON.parse(err.message))
  );
  const params = tryCatch(
    () => validator.parameters?.path?.parse(req.params) || req.params,
    (err: any) => (errors["params"] = JSON.parse(err.message))
  );
  const headers = tryCatch(
    () => validator.parameters?.header?.parse(req.headers) || req.headers,
    (err: any) => (errors["headers"] = JSON.parse(err.message))
  );
  const cookies = tryCatch(
    () => validator.parameters?.cookie?.parse(req.cookies) || req.cookies,
    (err: any) => (errors["cookies"] = JSON.parse(err.message))
  );

  if (!isEmpty(errors)) {
    throw new ValidationError(errors);
  }

  return {
    body: body ?? null,
    queries: (queries as Record<string, string>) ?? {},
    params: (params as Record<string, string>) ?? {},
    headers: (headers as Record<string, string>) ?? {},
    cookies: (cookies as Record<string, string>) ?? {}
  };
}

type PreparedResponse = {
  contentType: string;
  body: string | Buffer;
};

/**
 * Prepares an HTTP response body by determining its content type and formatting the body accordingly.
 * Returns an object containing the appropriate `contentType` and `body` based on the type of the input.
 *
 * @template T
 * @param {T} body - The response body, which can be of various types such as:
 *   - `string`: A plain text response
 *   - `number`: A numeric response
 *   - `boolean`: A boolean response
 *   - `object` or `Array`: A JSON-compatible response
 *   - `Buffer`: A binary response
 *   - `URLSearchParams`: A form-encoded response
 *
 * @returns {PreparedResponse} An object containing two properties:
 *    - `contentType`: A string representing the MIME type of the response based on the body type.
 *    - `body`: The appropriately formatted response body as a string or `Buffer`.
 *
 * @example
 * // Example usage with a string body
 * const response = prepareResponse("Hello, World!");
 * console.log(response.contentType); // "text/plain"
 * console.log(response.body); // "Hello, World!"
 *
 * @example
 * // Example usage with an object body
 * const response = prepareResponse({ key: "value" });
 * console.log(response.contentType); // "application/json"
 * console.log(response.body); // '{"key":"value"}'
 *
 * @example
 * // Example usage with a Buffer
 * const response = prepareResponse(Buffer.from([1, 2, 3]));
 * console.log(response.contentType); // "application/octet-stream"
 * console.log(response.body); // <Buffer 01 02 03>
 *
 * @example
 * // Example usage with URLSearchParams
 * const params = new URLSearchParams();
 * params.append("key", "value");
 * const response = prepareResponse(params);
 * console.log(response.contentType); // "application/x-www-form-urlencoded"
 * console.log(response.body); // "key=value"
 */
export function prepareResponse<T>(body: T): PreparedResponse {
  if (typeof body === "string" || typeof body === "number" || typeof body === "boolean") {
    return {
      contentType: "text/plain",
      body: String(body)
    };
  }
  if (Array.isArray(body) || typeof body === "object") {
    return {
      contentType: "application/json",
      body: JSON.stringify(body)
    };
  }
  if (Buffer.isBuffer(body)) {
    return {
      contentType: "application/octet-stream",
      body
    };
  }
  if (body instanceof URLSearchParams) {
    return {
      contentType: "application/x-www-form-urlencoded",
      body: Array.from(body)
        .map((item) => item.map(encodeURIComponent).join("="))
        .join("&")
    };
  }

  return {
    contentType: "text/plain",
    body: String(body)
  };
}

/**
 * Converts a path with parameterized segments (e.g., `/users/:userId/posts/:postId`)
 * into a new format where parameter names are wrapped in curly braces,
 * and returns an object with the modified path and the list of parameter names.
 *
 * @param {string} path - The URL path string that contains parameterized segments prefixed with `:`.
 *                        Example: `/users/:userId/posts/:postId`
 *
 * @returns {{ path: string, params: string[] }} An object with two properties:
 *    - `path`: A new path string where the parameterized segments are converted to `{paramName}` format.
 *              Example: `/users/{userId}/posts/{postId}`
 *    - `params`: An array of strings representing the names of the parameters extracted from the original path.
 *                Example: `['userId', 'postId']`
 *
 * @example
 * // Example usage:
 * const result = convertPathParams('/users/:userId/posts/:postId');
 * console.log(result.path);  // '/users/{userId}/posts/{postId}'
 * console.log(result.params); // ['userId', 'postId']
 */
export function convertPathParams(path: string): { path: string, params: string[] } {
  const paramRegex = /:([^/]+)/g;

  const newPath = cleanPath(path).replace(paramRegex, "{$1}");

  const paramNames = [];
  let match: RegExpExecArray | null = null;
  while ((match = paramRegex.exec(path)) !== null) {
    paramNames.push(match[1]);
  }

  return {
    path: newPath,
    params: compact(paramNames)
  };
}

/**
 * Cleans a URL or file path by replacing consecutive slashes (`/`) with a single slash.
 * This ensures that the path is formatted consistently with only one slash between segments.
 */
function cleanPath(path: string): string {
  return path.replace(/\/+/gi, "/");
}

/**
 * A utility function that wraps a function in a try-catch block. If the function succeeds,
 * it returns the result. If an error occurs, it catches the error, passes it to a custom error handler,
 * and returns `null`.
 */
function tryCatch<T>(fn: () => T, handler: (err: unknown) => void): T | null {
  try {
    return fn();
  } catch (err: unknown) {
    handler(err);
    return null;
  }
}
