# Frontend guide: login & registration (Sanctum SPA + Fortify)

Hand this document to the **Next.js repo** (or another SPA). It describes how that client talks to **this Laravel API** for session-based auth using **first-party cookies**, not bearer tokens.

**Backend stack:** Laravel 13 · Fortify (`views => false`, JSON-capable) · Sanctum stateful guard · `web` middleware on Fortify routes.

---

## 1. Origins & env you must align

| Backend `.env` | Typical local value | Meaning |
| --- | --- | --- |
| `APP_URL` | `http://localhost:8000` | Laravel origin (API). Use the URL your Next app calls (scheme + host + port). |
| `FRONTEND_URL` | `http://localhost:3000` | Next origin — drives **`config/cors.php`** `allowed_origins` (comma-separated if multiple). |
| `SANCTUM_STATEFUL_DOMAINS` | `localhost:3000,127.0.0.1:3000` | Hosts allowed to send session cookies on API requests (**no** scheme). |
| `SESSION_DOMAIN` | `localhost` | Cookie domain — use `localhost` when front + API are both on `localhost` with different ports. |

**Next.js:** set something like `NEXT_PUBLIC_API_URL=http://localhost:8000` and always request that origin for auth + `/api/*`.

Production: HTTPS everywhere, `SESSION_SECURE_COOKIE=true`, and matching production domains in `FRONTEND_URL` / `SANCTUM_STATEFUL_DOMAINS`.

---

## 2. Rules for every browser request

1. **`credentials: 'include'`** on all requests to the API origin (so cookies are stored and sent).
2. **`Accept: application/json`** — Fortify/Laravel return **JSON** instead of redirects when the client “wants JSON”.
3. **`Content-Type: application/json`** on POST bodies that send JSON.
4. **`X-Requested-With: XMLHttpRequest`** — matches Laravel’s expectations for SPA-style requests.
5. **`X-XSRF-TOKEN`** — after hitting the CSRF cookie endpoint, read the **`XSRF-TOKEN`** cookie (URL-decoded) and send it on **state-changing** requests (`POST`, `PUT`, `PATCH`, `DELETE`). Omit **`Content-Type`** on plain **`GET`** requests.

Cookie flows normally belong in the **browser** (`credentials: 'include'` does nothing useful from a plain Node server component unless you forward cookies manually). Prefer **client components** or **Route Handlers** that proxy cookies if you need SSR integration.

---

## 3. Bootstrap CSRF (once per “visit”, refresh before forms)

**`GET {APP_URL}/sanctum/csrf-cookie`**

- No body.
- Use `credentials: 'include'`.
- Laravel sets `XSRF-TOKEN` (encrypted cookie). Your client reads it and echoes `X-XSRF-TOKEN` on subsequent writes.

Call this **before** register/login/logout, or after **419** / expired session.

---

## 4. Registration

**`POST {APP_URL}/register`** (Fortify — **not** under `/api`)

JSON body:

| Field | Rules |
| --- | --- |
| `name` | Required, string, max 255 |
| `email` | Required, valid email, max 255, unique |
| `password` | Required, string, Laravel default rule (**minimum 8 characters**) |
| `password_confirmation` | Required — must match `password` |

Notes:

- `email` is lowercased server-side when `fortify.lowercase_usernames` is true (this app uses **email** as the username field).

**Successful JSON response**

- **HTTP `201`**
- Body is empty (`Content-Length: 0`). The user is **logged in**: session cookie is issued.

**Validation errors**

- **HTTP `422`** with Laravel shape: `message`, `errors: { field: string[] }`.

Then fetch the profile if needed (see §6).

---

## 5. Login

**`POST {APP_URL}/login`** (Fortify — **not** under `/api`)

JSON body:

| Field | Rules |
| --- | --- |
| `email` | Required string |
| `password` | Required string |
| `remember` | Optional boolean |

**Success without two-factor**

- **HTTP `200`**
- JSON: `{ "two_factor": false }`
- Session cookie established.

**Success but two-factor required**

This backend has **two-factor authentication enabled** in Fortify. If the account uses confirmed 2FA:

- **HTTP `200`**
- JSON: `{ "two_factor": true }`
- Session has pending login state — client must complete **`POST {APP_URL}/two-factor-challenge`** (see §8).

**Failure**

- **HTTP `422`** — invalid credentials show under `errors.email` (Fortify username field) with `auth.failed` message.

**Throttle**

- Too many attempts → **HTTP `429`** (Fortify login rate limiter).

---

## 6. Check “who am I?” (optional after login/register)

**`GET {APP_URL}/api/user`**

- Middleware: `auth:sanctum`
- Headers: same as §2 + cookies from login/register
- **200:** JSON user object (whatever Laravel serializes for `$request->user()` — includes `id`, `name`, `email`, etc.).
- **401:** not authenticated — redirect to login UI.

---

## 7. Logout (same cookie rules)

**`POST {APP_URL}/logout`**

- CSRF header required (§3).
- **`credentials: 'include'`**

**Success**

- **HTTP `204`**, empty body when `Accept: application/json`.

---

## 8. Appendix: two-factor completion (`two_factor: true`)

Only needed when **`POST /login`** returned **`{ "two_factor": true }`**.

**`POST {APP_URL}/two-factor-challenge`**

JSON body (one of):

- `{ "code": "<6-digit TOTP>" }`, or
- `{ "recovery_code": "<recovery code>" }`

**Success**

- **HTTP `204`**, empty body — session is fully authenticated.

**Failure**

- **HTTP `422`** via Fortify’s failed 2FA response.

---

## 9. Minimal TypeScript-style client sketch

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL!;

function xsrfHeader(): Record<string, string> {
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  const raw = match ? decodeURIComponent(match[1]) : '';
  return raw ? { 'X-XSRF-TOKEN': raw } : {};
}

async function ensureCsrfCookie(): Promise<void> {
  await fetch(`${API_URL}/sanctum/csrf-cookie`, {
    method: 'GET',
    credentials: 'include',
  });
}

async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...xsrfHeader(),
    ...(init.headers ?? {}),
  };

  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers,
  });

  const raw = await res.text();
  let data: unknown = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = {};
    }
  }

  if (!res.ok) {
    throw Object.assign(new Error('Request failed'), { status: res.status, data });
  }

  return data as T;
}

export async function register(payload: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<void> {
  await ensureCsrfCookie();
  await apiJson('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function login(payload: {
  email: string;
  password: string;
  remember?: boolean;
}): Promise<{ two_factor: boolean }> {
  await ensureCsrfCookie();
  return apiJson<{ two_factor: boolean }>('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function completeTwoFactor(
  payload: { code: string } | { recovery_code: string },
): Promise<void> {
  await ensureCsrfCookie();
  await apiJson('/two-factor-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function logout(): Promise<void> {
  await ensureCsrfCookie();
  await apiJson('/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
}

export async function fetchCurrentUser(): Promise<unknown> {
  await ensureCsrfCookie();
  return apiJson('/api/user', { method: 'GET' });
}
```

---

## 10. Quick reference (URLs)

| Action | Method | Path |
| --- | --- | --- |
| CSRF cookie | GET | `/sanctum/csrf-cookie` |
| Register | POST | `/register` |
| Login | POST | `/login` |
| 2FA challenge | POST | `/two-factor-challenge` |
| Current user | GET | `/api/user` |
| Logout | POST | `/logout` |

All paths are relative to **`APP_URL`** (e.g. `http://localhost:8000/register`).

---

## 11. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| **401** on `/api/user` after “successful” login | Cookies not sent (`credentials` missing), wrong API origin, or host not listed in `SANCTUM_STATEFUL_DOMAINS`. |
| **419** (“Page Expired”) on POST | Missing or stale CSRF — call **`GET /sanctum/csrf-cookie`** again, then retry with fresh **`X-XSRF-TOKEN`**. |
| CORS error | `FRONTEND_URL` must include your Next origin exactly (`http://localhost:3000`, not `*.localhost`). |
| **422** on login with correct password | User may need **`POST /two-factor-challenge`** if **`two_factor: true`** was returned. |

Related: chat-specific API usage stays in **`docs/chat-frontend.md`**; this file is **auth/session only**.