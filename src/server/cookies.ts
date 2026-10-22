export function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(";").reduce(
    (cookies, cookie) => {
      const [name, ...rest] = cookie.trim().split("=");
      if (!name) {
        return cookies;
      }
      const value = rest.join("=");
      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        // keep the raw value of a malformed cookie instead of failing the whole request
        cookies[name] = value;
      }
      return cookies;
    },
    {} as Record<string, string>
  );
}
