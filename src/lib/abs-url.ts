export function absoluteUrl(req: Request, path: string): URL {
  const h = req.headers;
  const proto = h.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? new URL(req.url).host;
  return new URL(path, `${proto}://${host}`);
}
