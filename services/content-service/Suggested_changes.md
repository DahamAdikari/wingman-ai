# Content Service — Suggested Changes

Audit of `update/content-service-v2` against the architecture defined in `.claude/`.

---

## Critical

### 1. `manager_id` accepted from request body — security bypass
**File:** `src/routes/content.js:7`

```js
// Current (insecure)
function getManagerId(req) {
  return req.headers['x-manager-id'] || req.body?.manager_id;
}
```

The body fallback means any caller can send an arbitrary `manager_id` without going through the API Gateway's JWT verification. The service will then query and write data scoped to that spoofed manager, breaking multi-tenant isolation.

**Fix:** Only trust the `x-manager-id` header. The API Gateway always injects it from the JWT. If it's absent, the request bypassed the gateway and must be rejected.

```js
function getManagerId(req) {
  return req.headers['x-manager-id'];
}
```

---

## High

### 2. `ASSET_UPLOADED` event not consumed
**File:** `src/events/consumer.js:5`

```js
// Current — missing ASSET_UPLOADED
const BINDINGS = ['CLIENT_FEEDBACK', 'CONTENT_REJECTED'];
```

Per the architecture (`events/CLAUDE.md`), content service must also consume `ASSET_UPLOADED` from Asset Service and cache the asset reference (URL/ID only) in its own DB for use during content generation. Without this, every generated post is un-branded — the service never learns what logos or templates the manager has uploaded.

**Fix:**
- Add `ASSET_UPLOADED` to `BINDINGS`
- Add a `cacheAsset` handler that writes to a new `asset_cache` table
- Add `asset_cache` table to `db/init.js`
- Add `cacheAsset` query to `db/queries.js`

---

## Medium

### 3. Caption generation (slow external AI calls) lives in `contentService.js`
**File:** `src/services/contentService.js:15-41`

The architecture spec explicitly isolates slow AI API calls into a dedicated service file:
> `services/imageService.js` — AI image generation API calls (slow — isolated here)

Caption generation via Gemini/OpenAI is equally a slow external API call and should be in `captionService.js`. Currently `contentService.js` is mixing orchestration with direct AI SDK calls.

**Fix:** Create `src/services/captionService.js` containing all caption generation logic. `contentService.js` imports `generateCaption` from it, keeping the service as pure orchestration.

---

### 4. No RabbitMQ connection retry
**Files:** `src/events/publisher.js`, `src/events/consumer.js`

Both files connect to RabbitMQ on first use with no retry. In Docker Compose, the content service starts faster than RabbitMQ becomes fully ready. `startConsumer()` will throw on startup, crashing the service.

**Fix:** Extract `connectWithRetry()` into `src/events/connect.js` with exponential-backoff retry (default 10 attempts, 3s delay). Both publisher and consumer use it.

---

### 5. Consumer uses lazy `require` to avoid circular dependency
**File:** `src/events/consumer.js:24`

```js
// Lazy require to avoid circular dependency at module load time
const { regenerateContent } = require('../services/contentService');
```

This is a code smell — the circular dependency is being papered over rather than fixed. The better pattern is dependency injection: pass handlers as parameters to `startConsumer()`.

**Fix:**
```js
// consumer.js
async function startConsumer({ regenerateContent, cacheAsset }) { ... }

// index.js
const { regenerateContent } = require('./services/contentService');
const { cacheAsset } = require('./db/queries');
await startConsumer({ regenerateContent, cacheAsset });
```

This also makes the consumer independently testable.

---

## Minor

### 6. SDK clients instantiated on every caption generation call
**File:** `src/services/contentService.js:17,31`

`new GoogleGenerativeAI(...)` and `new OpenAI(...)` are created fresh on every call. These should be module-level singletons initialized once.

**Fix:** Use lazy-initialized module-level variables in `captionService.js` (fixed as part of #3).

---

### 7. `cors` and `body-parser` listed as dependencies but unused
**File:** `package.json`

Neither `cors` nor `body-parser` is imported anywhere in the service. Remove them.

---

### 8. No platform value validation
**File:** `src/routes/content.js:15`

The spec defines `platform` as `'instagram' | 'linkedin' | 'twitter'`. The route accepts any string. Add a validation check before calling the service.

---

### 9. Dockerfile uses `npm install` instead of `npm ci`
**File:** `Dockerfile:4`

For containerized builds, `npm ci` installs exactly what is in `package-lock.json` for reproducible builds and fails fast if the lockfile is out of sync. `npm install` can silently upgrade packages.

---

## Summary Table

| # | Issue | Severity | File |
|---|---|---|---|
| 1 | `manager_id` read from request body — security bypass | **Critical** | `routes/content.js:7` |
| 2 | `ASSET_UPLOADED` event not consumed | **High** | `events/consumer.js:5` |
| 3 | Caption generation mixed into contentService | **Medium** | `services/contentService.js:15-41` |
| 4 | No RabbitMQ connection retry | **Medium** | `events/publisher.js`, `events/consumer.js` |
| 5 | Circular dependency workaround via lazy require | **Medium** | `events/consumer.js:24` |
| 6 | SDK clients re-instantiated on every call | **Low** | `services/contentService.js:17,31` |
| 7 | `cors` and `body-parser` unused dependencies | **Low** | `package.json` |
| 8 | No platform value validation | **Low** | `routes/content.js:15` |
| 9 | `npm install` instead of `npm ci` in Dockerfile | **Low** | `Dockerfile:4` |
