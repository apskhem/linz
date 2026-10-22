import type { HttpMethod } from "../endpoint";

/**
 * Splits an endpoint key such as `get:/users/:id` into its method and path.
 */
export function parseMethodPath(methodPath: string): { method: HttpMethod; path: string } {
  const [method = "", ...pathParts] = methodPath.split(":");

  return { method: method as HttpMethod, path: pathParts.join(":") };
}

export function convertPathParams(path: string): { path: string; params: string[] } {
  const paramRegex = /:([^/]+)/g;

  const newPath = cleanPath(path).replace(paramRegex, "{$1}");

  const paramNames: string[] = [];
  let match: RegExpExecArray | null = null;
  while ((match = paramRegex.exec(path)) !== null) {
    paramNames.push(match[1]!);
  }

  return {
    path: newPath,
    params: paramNames,
  };
}

export function cleanPath(path: string): string {
  return path.replace(/\/+/gi, "/");
}
