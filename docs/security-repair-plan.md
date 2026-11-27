# Repair plan: unauthenticated certificate / PDF access (export.vmvt.lt)

Report summary: certificate data and PDF files can be fetched by anyone who knows or guesses a
certificate number (`EXP26024567` pattern), via

```
GET /api/certificates/search?certificateNumber=EXP26024567
GET /api/certificates/files/EXP26024567
GET /api/certificates/download/<sharepoint-item-id>/<file>.pdf
```

Design decision: the endpoints **stay public** (no login). The intended access model is a
two-factor lookup: the caller must present **both** the certificate number and the blank
(form) number printed on the paper certificate. Today the blank number is optional, so the
second factor is never enforced, and the files/download endpoints never ask for it at all.

Issues found in the code (all on `main`, commit `86e579b`):

| # | Issue | Where |
|---|-------|-------|
| 1 | `blankNumber` optional; certificate number alone is enough; substring (`ilike %..%`) match with 3-char minimum makes enumeration trivial | `services/certificates.service.ts` `search` |
| 2 | `files/:id` uses the URL parameter directly as a SharePoint folder path: no blank-number check, no certificate lookup, no format validation | `services/sharePoint.service.ts` `getFiles` |
| 3 | `download/:id/:name` is a permanent, unsigned link. The SharePoint item ID is "unguessable" but is handed out by issue 2, so once leaked a PDF stays reachable forever | `services/sharePoint.service.ts` `download`, `getFileUrl` |
| 4 | No rate limiting, so brute-forcing numbers (and, after the fix, blank numbers) is cheap | `services/api.service.ts` |
| 5 | (optional hardening) `search` returns internal issuer fields (`issueEmail`, `issueName`, `issueDepartment`) to anonymous callers | `services/certificates.service.ts` field schema |

Fixes 1 to 4 are the actual repair. Fix 5 is recommended but a product decision.

---

## Fix 1 — require blank number, exact two-factor match  (Issue 1)

Both numbers become required. Matching is exact after stripping spaces and ignoring case
(the data has stray spaces, see the existing comment), replacing the `%..%` substring match.
`year` stays optional.

```diff
--- a/services/certificates.service.ts
+++ b/services/certificates.service.ts
@@
+function normalizeNumber(value: string) {
+  return value.replace(/\s+/g, '').toUpperCase();
+}
+
 @Service({
   name: 'certificates',
@@
   @Action({
     rest: 'GET /search',
     params: {
-      certificateNumber: 'string|convert|min:3',
+      certificateNumber: 'string|convert|trim|min:3|max:64',
+      blankNumber: 'string|convert|trim|min:3|max:64',
       year: 'string|convert|optional',
-      blankNumber: 'string|convert|optional',
     },
   })
-  async search(ctx: Context<{ certificateNumber: string; year?: string; blankNumber?: number }>) {
+  async search(ctx: Context<{ certificateNumber: string; blankNumber: string; year?: string }>) {
     const { certificateNumber, year, blankNumber } = ctx.params;
 
-    // it's really messy. Spaces can be found anywhere (except in cetirifacte number (without letters))
+    // Data contains stray spaces, so compare with spaces removed. Both numbers are required:
+    // the blank number is the second factor that proves the caller holds the paper certificate.
     const query: any = {
       certificateNumber: {
-        $ilike: `%${certificateNumber}%`,
+        $raw: {
+          condition: "upper(replace(certificate_number, ' ', '')) = ?",
+          bindings: [normalizeNumber(certificateNumber)],
+        },
+      },
+      blankNumber: {
+        $raw: {
+          condition: "coalesce(blank_number, '') <> '' AND upper(replace(blank_number, ' ', '')) = ?",
+          bindings: [normalizeNumber(blankNumber)],
+        },
       },
     };
 
-    if (blankNumber) {
-      query.blankNumber = {
-        $ilike: `%${blankNumber}%`,
-      };
-    }
-
     if (year) {
```

Notes
- `coalesce(blank_number,'') <> ''` makes certificates with no stored blank number unreachable
  rather than matchable by a lucky guess. Check how many rows have an empty `blank_number`
  before shipping (`select count(*) from certificates where coalesce(blank_number,'')=''`) and
  decide whether those must be backfilled from the source system.
- Column names are snake_case in Postgres (`knexSnakeCaseMappers` in `knexfile.ts`), matching
  the existing `issue_date` raw condition.
- The 404 / "More than 1" handling stays as is. A failed match returns the same 404 whether the
  certificate number or the blank number was wrong, so the response does not confirm that a
  certificate number exists.
- **Breaking change for the client UI**: the search form must send `blankNumber`.

---

## Fix 2 — files endpoint goes through the certificate lookup  (Issue 2)

`GET /api/certificates/files/:id?blankNumber=...`. The handler first calls
`certificates.search` (Fix 1), which throws 404 unless exactly one certificate matches both
numbers, and only then lists the SharePoint folder, using the certificate number from the
database rather than the raw URL parameter. The parameter is also pattern-validated so it can
never be used to walk SharePoint paths.

```diff
--- a/services/sharePoint.service.ts
+++ b/services/sharePoint.service.ts
@@
   @Action({
     rest: <RestSchema>{
       method: 'GET',
       basePath: '/certificates',
       path: '/files/:id',
     },
     params: {
-      id: 'string',
+      id: { type: 'string', trim: true, min: 3, max: 64, pattern: /^[A-Za-z0-9 _-]+$/ },
+      blankNumber: 'string|convert|trim|min:3|max:64',
     },
   })
-  async getFiles(ctx: Context<{ id: string }>) {
-    await this.validateToken();
+  async getFiles(ctx: Context<{ id: string; blankNumber: string }>) {
+    const { id, blankNumber } = ctx.params;
 
-    const id = ctx.params.id;
+    // Second factor: throws 404 unless both numbers identify exactly one certificate.
+    const certificate: { certificateNumber: string } = await ctx.call('certificates.search', {
+      certificateNumber: id,
+      blankNumber,
+    });
 
-    const filesInfo: { id: string; name: string; size: number }[] = await this.getFilesInfo(id);
+    await this.validateToken();
+
+    const filesInfo: { id: string; name: string; size: number }[] = await this.getFilesInfo(
+      certificate.certificateNumber,
+    );
 
     if (!filesInfo.length) {
       return [];
     }
 
     const data = [];
 
     for (const f of filesInfo) {
-      const url = await this.getFileUrl(f.id, f.name);
+      const url = this.getFileUrl(f.id, f.name);
       data.push({
```

Notes
- `mergeParams: true` is already set on the route, so the `blankNumber` query parameter lands
  in `ctx.params` next to the path parameter.
- `ctx.call('certificates.search', ...)` is an internal broker call; it does not go through the
  HTTP whitelist and needs no change to `api.service.ts`.
- **Breaking change for the client UI**: the files request must carry `?blankNumber=`.

---

## Fix 3 — signed, expiring download links  (Issue 3)

Download URLs returned by Fix 2 get `exp` (unix seconds) and `sig` (HMAC-SHA256 over
`id`, `name`, `exp`) query parameters. The download handler rejects missing, tampered or
expired signatures with the same 404 it already uses. Default lifetime is 15 minutes, which
covers a user clicking a link on the results page. A leaked SharePoint item ID is therefore
useless on its own.

```diff
--- a/services/sharePoint.service.ts
+++ b/services/sharePoint.service.ts
@@
 'use strict';
+import { createHmac, timingSafeEqual } from 'crypto';
 import _ from 'lodash';
@@
 export default class extends Moleculer.Service {
+  created() {
+    const secret = process.env.DOWNLOAD_URL_SECRET;
+    if (!secret || secret.length < 32) {
+      throw new Error('DOWNLOAD_URL_SECRET must be set and be at least 32 characters long');
+    }
+  }
+
   @Method
   async authenticate() {
@@
   @Method
-  getFileUrl(id: string, fileName: string) {
-    return `${process.env.SERVER_HOST}/certificates/download/${id}/${fileName}`;
+  signDownload(id: string, fileName: string, exp: number) {
+    return createHmac('sha256', process.env.DOWNLOAD_URL_SECRET)
+      .update(`${id}\n${fileName}\n${exp}`)
+      .digest('base64url');
+  }
+
+  @Method
+  getFileUrl(id: string, fileName: string) {
+    const ttl = Number(process.env.DOWNLOAD_URL_TTL_SECONDS || 15 * 60);
+    const exp = Math.floor(Date.now() / 1000) + ttl;
+    const qs = new URLSearchParams({ exp: String(exp), sig: this.signDownload(id, fileName, exp) });
+    return (
+      `${process.env.SERVER_HOST}/certificates/download/` +
+      `${encodeURIComponent(id)}/${encodeURIComponent(fileName)}?${qs}`
+    );
   }
@@
   @Action({
     rest: <RestSchema>{
       method: 'GET',
       basePath: '/certificates',
       path: '/download/:id/:name',
     },
     params: {
-      id: 'string',
-      name: 'string',
+      id: { type: 'string', min: 1, max: 128, pattern: /^[A-Za-z0-9]+$/ },
+      // no quotes, slashes or line breaks: the name is echoed into Content-Disposition
+      name: { type: 'string', min: 1, max: 255, pattern: /^[^"\\/\r\n]+$/ },
+      exp: 'number|convert|integer|positive',
+      sig: 'string|min:16|max:128',
     },
   })
-  async download(ctx: Context<{ id: string; name: string }, any>) {
+  async download(ctx: Context<{ id: string; name: string; exp: number; sig: string }, any>) {
+    const { id, name, exp, sig } = ctx.params;
+
+    const expected = this.signDownload(id, name, exp);
+    const signatureValid =
+      sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
+
+    if (!signatureValid || exp < Math.floor(Date.now() / 1000)) {
+      throwNotFoundError('Certificate file not found.');
+    }
+
     await this.validateToken();
 
     const token: any = await this.getToken();
@@
-    const { id, name } = ctx.params;
     const fileInfo: any = await this.getFileInfo(id);
```

```diff
--- a/.env.example
+++ b/.env.example
@@
 SERVER_HOST=http://localhost:3000
+
+# HMAC secret for signed PDF download links (>= 32 random chars) and link lifetime
+DOWNLOAD_URL_SECRET=
+DOWNLOAD_URL_TTL_SECONDS=900
```

Notes
- The existing document-type (`Sertifikatas`) and file-name checks stay; the signature is an
  additional gate in front of them.
- `DOWNLOAD_URL_SECRET` must be added to the test and production deployment secrets before
  the release, otherwise the service refuses to start (deliberate: an unset secret would make
  every link forgeable).
- Alternative considered: require `certificateNumber` and `blankNumber` on the download URL
  and verify the file's `parentReference.path` ends with the certificate folder. It works, but
  it puts the second factor into every PDF link and costs an extra Graph call. Signed links were
  preferred because clients already take the URL verbatim from the files response.

---

## Fix 4 — rate limiting on the public route  (Issue 4)

With the second factor in place, the remaining attack is brute-forcing blank numbers for a
known certificate number. A per-IP limit makes that impractical.

```diff
--- a/services/api.service.ts
+++ b/services/api.service.ts
@@
         // Mapping policy setting. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Mapping-policy
         mappingPolicy: 'restrict', // Available values: "all", "restrict"
 
+        // Public lookup endpoints: throttle per client IP to make number guessing impractical.
+        rateLimit: {
+          window: 60 * 1000,
+          limit: Number(process.env.RATE_LIMIT_PER_MINUTE || 30),
+          headers: true,
+          key: (req: any) =>
+            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
+            req.socket?.remoteAddress,
+        },
+
         // Enable/disable logging
         logging: true,
```

Notes
- Confirm that the ingress / reverse proxy in front of the container sets `X-Forwarded-For`
  and strips a client-supplied one; otherwise fall back to `remoteAddress` only.
- The built-in store is in-memory per process. If production runs more than one replica,
  pass a Redis-backed `StoreFactory` (moleculer-web supports a custom store) so the limit is
  shared. The broker already has a Redis connection.
- Consider moving `/api/ping` to its own route without the limiter so health checks are never
  throttled (the Dockerfile healthcheck hits it every 30 s, which is well under the limit).

---

## Fix 5 (optional) — hide internal issuer fields from the public response  (Issue 5)

Even a legitimate verifier does not need the issuing officer's e-mail address. Hiding the
fields in the schema removes them from every response without touching the handler.

```diff
--- a/services/certificates.service.ts
+++ b/services/certificates.service.ts
@@
       issueEmail: {
         type: 'string',
+        hidden: true,
         get: trimValueSpaces,
       },
       issueName: {
         type: 'string',
+        hidden: true,
         get: trimValueSpaces,
       },
       issueDepartment: {
         type: 'string',
+        hidden: true,
         get: trimValueSpaces,
       },
```

Decide with the business owner whether the client UI shows any of these today.

---

## Rollout

1. Implement fixes 1 to 4 (and 5 if approved) on a branch; `yarn lint` and `yarn build` must pass.
2. Add `DOWNLOAD_URL_SECRET` (and optionally `DOWNLOAD_URL_TTL_SECONDS`, `RATE_LIMIT_PER_MINUTE`)
   to the test and production environment secrets.
3. Update the consuming UI to send `blankNumber` to both `search` and `files` and to use the
   download URL exactly as returned. Deploy API and UI together, since the API change is breaking.
4. Merge to `main` (auto-deploys to staging) and verify manually:

   | Request | Expected |
   |---|---|
   | `search?certificateNumber=<valid>` (no blank) | 422 validation error |
   | `search?certificateNumber=<valid>&blankNumber=<wrong>` | 404 |
   | `search?certificateNumber=<valid>&blankNumber=<right>` | 200, single certificate, no issuer fields (if fix 5) |
   | `files/<valid>` (no blank) | 422 |
   | `files/<valid>?blankNumber=<right>` | 200, URLs contain `exp` and `sig` |
   | `download/<id>/<name>` without `sig` | 422 |
   | returned download URL within TTL | 200 PDF |
   | same URL after TTL, or with one changed character in `sig` | 404 |
   | 31+ requests in one minute from one IP | 429 |

5. Tag a release (`x.y.z`) to deploy production.
6. Afterwards: review access logs for enumeration patterns before the fix, and reply to the
   reporter. No credential rotation is needed; the SharePoint client secret was not exposed.
