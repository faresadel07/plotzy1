// The single fetch helper every admin panel query goes through.
//
// Why this exists: the panel used to call
//   fetch(url).then(r => r.json())
// everywhere, with no r.ok check. When the API answered 401/403/500 it
// returns `{ message: "..." }`, which resolves as a SUCCESSFUL query, so
// `const { data = [] }` never fell back to the default and the next
// `data.map(...)` threw "x.map is not a function" during render. That
// throw escaped to the app-root ErrorBoundary and replaced the entire
// site with the crash screen — the "it errors and throws me out of the
// page" report.
//
// adminFetch turns any non-2xx into a rejected query instead, so React
// Query reports `isError` and the tab renders a retry card.

export class AdminApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

async function parseBody(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // An HTML error page (proxy timeout, 502) is not JSON. Surface a
    // readable message instead of a SyntaxError.
    return { message: text.slice(0, 200) };
  }
}

/** GET/POST/... any admin endpoint. Throws AdminApiError on non-2xx. */
export async function adminFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const body = await parseBody(res);
  if (!res.ok) {
    const message =
      (body && typeof body === "object" && typeof body.message === "string" && body.message) ||
      `Request failed (${res.status})`;
    throw new AdminApiError(res.status, message);
  }
  return body as T;
}

/** A GET that MUST yield an array. Anything else becomes an empty list
 *  rather than a render-time crash, so one malformed payload cannot take
 *  a tab down. */
export async function adminFetchList<T = any>(url: string): Promise<T[]> {
  const body = await adminFetch<unknown>(url);
  return Array.isArray(body) ? (body as T[]) : [];
}

/** Human-readable text for a failed admin query. */
export function adminErrorText(err: unknown, ar: boolean): string {
  if (err instanceof AdminApiError) {
    if (err.status === 401) return ar ? "انتهت الجلسة. سجّل الدخول مرة أخرى." : "Your session expired. Sign in again.";
    if (err.status === 403) return ar ? "هذا القسم يحتاج صلاحية مشرف." : "This section needs admin access.";
    if (err.status === 404) return ar ? "هذه البيانات غير متوفرة على الخادم." : "This data is not available on the server.";
    return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return ar ? "تعذّر تحميل البيانات." : "Could not load this data.";
}
