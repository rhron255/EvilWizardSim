/**
 * Which requests the local review server will answer at all.
 *
 * Binding to 127.0.0.1 keeps other MACHINES out; it does nothing about other
 * WEB PAGES in the author's own browser. A page on any origin can POST to
 * `http://127.0.0.1:<port>/api/edit` — a `text/plain` body is a CORS "simple
 * request", so there is no preflight to stop it — and this server writes source
 * files. A page on a rebound DNS name can also READ `/api/content`, because
 * nothing checked the Host header. Three rules close both:
 *
 *   - Host must be this server's own loopback address and port (stops rebinding);
 *   - an Origin header, when the browser sends one, must be this server too;
 *   - a POST must declare `application/json`, which a cross-origin page cannot
 *     send without a preflight this server never answers.
 */

export type GuardInput = {
  method?: string;
  host?: string;
  origin?: string;
  contentType?: string;
};

/** null when the request may proceed, otherwise the reason it is refused. */
export function guardRequest({ method, host, origin, contentType }: GuardInput, port: number): string | null {
  const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
  if (!host || !hosts.includes(host.toLowerCase())) {
    return `unexpected Host "${host ?? ''}" — this tool only answers on its own loopback address`;
  }
  if (origin !== undefined && !hosts.map((h) => `http://${h}`).includes(origin.toLowerCase())) {
    return `unexpected Origin "${origin}" — another page is trying to use this tool`;
  }
  if (method === 'POST' && !/^application\/json(\s*;|$)/i.test(contentType ?? '')) {
    return 'POST bodies must be sent as application/json';
  }
  return null;
}
