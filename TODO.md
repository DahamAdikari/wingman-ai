# Wingman AI — Implementation TODO

> **Last updated:** 2026-05-01
> **How to update:** Say "update todo.md" — Claude Code will re-scan the codebase and refresh this file.

---

## Legend
- `[x]` Done
- `[-]` Partially implemented / skeleton only
- `[ ]` Not started

---

## Services

### api-gateway (port 4000) — ✅ Complete
- [x] Express app with helmet, CORS, morgan
- [x] JWT verification middleware (`src/middleware/auth.js`)
- [x] `manager_id` / `user_id` / `role` injection into all forwarded requests
- [x] Generic forward proxy (`src/proxy/forward.js`)
- [x] Route: `POST /api/auth/login` → user-service
- [x] Route: `POST /api/auth/register` → user-service
- [x] Route: `POST /api/content` → content-service
- [x] Route: `GET /api/content/:id` → content-service
- [x] Route: `GET /api/projects` → query-service (dashboard read)
- [x] Route: `POST /api/projects` → user-service
- [x] Route: `PATCH /api/projects/:id` → user-service
- [x] Route: `POST /api/projects/:id/members` → user-service
- [x] Route: `GET /api/projects/:id/posts` → content-service
- [x] Route: `GET /api/projects/:id/detail` — parallel fan-out to content + review + user (partial-failure tolerant)
- [x] Route: `POST /api/review/:id` → review-service
- [x] Route: `GET /api/review/:id` → review-service
- [x] Route: `GET /api/users` → user-service
- [x] Route: `POST /api/users` → user-service
- [x] Route: `GET /api/users/:id` → user-service
- [x] Route: `GET /api/assets` → asset-service (forwarding ready; asset-service not yet built)
- [x] Route: `POST /api/assets` → asset-service (forwarding ready; asset-service not yet built)
- [x] Dockerfile

---

### user-service (port 5001) — ✅ Complete
- [x] Express app, `src/routes/`, `src/services/`, `src/db/`, `src/events/` structure
- [x] `user_db` schema: `managers`, `users`, `projects`, `project_members`
- [x] `POST /auth/register` — manager registration with bcrypt password hash
- [x] `POST /auth/login` — JWT issuance
- [x] `GET /users` — list users for a manager
- [x] `POST /users` — create user (roles: `client`, `team_member`, `viewer`)
- [x] `GET /users/:id` — get single user
- [x] `GET /users/project/:projectId` — list members for a project
- [x] `POST /projects` — create project + publishes `PROJECT_CREATED`
- [x] `GET /projects` — list projects for a manager
- [x] `PATCH /projects/:id` — update name / description / status
- [x] `POST /projects/:id/members` — enrol user into project (roles: `client`, `reviewer`, `viewer`)
- [x] `manager_id` filter on every DB query (multi-tenant isolation)
- [x] Dockerfile
- [x] docker-compose entry with `user-db` + healthcheck

---

### content-service (port 5002) — ✅ Complete
- [x] Express app, `src/routes/`, `src/services/`, `src/db/`, `src/events/` structure
- [x] `content_db` schema: `posts`, `post_versions`, `templates`, `prompts`, `asset_cache`
- [x] `POST /content` — create post, run AI caption + image generation, publish `CONTENT_CREATED`
- [x] `GET /content/:id` — get single post with all versions
- [x] `GET /content/project/:projectId` — get all posts for a project
- [x] `src/services/captionService.js` — AI caption generation
- [x] `src/services/imageService.js` — AI image generation
- [x] `src/events/publisher.js` — topic exchange publisher
- [x] `src/events/consumer.js` — consumes `CLIENT_FEEDBACK`, `CONTENT_REJECTED` (re-generation), `ASSET_UPLOADED` (cache)
- [x] `manager_id` on every post and version
- [x] Dockerfile
- [x] docker-compose entry with `content-db` + `rabbitmq` dependency

---

### query-service (port 5005) — ✅ Complete
- [x] Express app, `src/routes/`, `src/db/`, `src/events/` structure
- [x] `query_db` schema: `projects_view` (denormalized stats), `posts_map` (post_id → project_id lookup)
- [x] `GET /query/projects` — return denormalised dashboard view for a manager
- [x] `src/events/consumer.js` — durable named queue, all events handled
  - [x] `PROJECT_CREATED` → seeds `projects_view` row
  - [x] `CONTENT_CREATED` → increments `total_posts`, seeds `posts_map`
  - [x] `MANAGER_APPROVED` → increments `posts_in_review`, sets status to `client_review`
  - [x] `CLIENT_FEEDBACK` → stores `last_feedback_snippet`, sets status to `client_review`
  - [x] `CONTENT_APPROVED` → increments `posts_approved`, decrements `posts_in_review`
  - [x] `CONTENT_REJECTED` → decrements `posts_in_review`, sets status to `rejected`
  - [x] `POST_PUBLISHED` → resolves `project_id` via `posts_map`, increments `posts_published`
- [x] Dockerfile
- [x] docker-compose entry with `query-db` + `rabbitmq` dependency

---

### review-service (port 5004) — ❌ Stub only
- [x] Project folder exists (`services/review-service/`)
- [-] RabbitMQ consumer exists — but only auto-approves (mock, not real logic)
- [ ] Restructure into `src/routes/`, `src/services/`, `src/db/`, `src/events/`
- [ ] `review_db` schema: `reviews`, `approval_state`
- [ ] `POST /review/:id` — submit manager or client review decision
- [ ] `GET /review/:id` — get review history for a post
- [ ] `GET /review/project/:id` — get all reviews for a project
- [ ] Manager approval → emit `MANAGER_APPROVED`
- [ ] Client approval → emit `CONTENT_APPROVED`
- [ ] Client rejection → emit `CONTENT_REJECTED` (with `rejected_by: 'client'`)
- [ ] Manager rejection → emit `CONTENT_REJECTED` (with `rejected_by: 'manager'`)
- [ ] Client feedback/change-request → emit `CLIENT_FEEDBACK`
- [ ] Remove auto-approval stub
- [ ] `manager_id` filter on every DB query
- [ ] Dockerfile
- [ ] docker-compose entry with `review-db` + `rabbitmq` dependency

---

### asset-service (port 5003) — ❌ Not started
- [ ] Project folder (`services/asset-service/`)
- [ ] Express app, `src/routes/`, `src/services/`, `src/db/`, `src/events/` structure
- [ ] `asset_db` schema: `assets` (id, manager_id, project_id, type, file_url)
- [ ] `GET /assets` — list assets for a manager/project
- [ ] `POST /assets` — upload asset (logo, template, prompt)
- [ ] `DELETE /assets/:id` — delete asset
- [ ] S3-compatible upload integration
- [ ] `src/events/publisher.js` — emit `ASSET_UPLOADED`
- [ ] `manager_id` filter on every DB query
- [ ] Dockerfile
- [ ] docker-compose entry with `asset-db` + `rabbitmq` dependency

---

### realtime-service (port 5006) — ❌ Not started
- [ ] Project folder (`services/realtime-service/`)
- [ ] WebSocket server (no REST routes)
- [ ] JWT-based WebSocket connection auth
- [ ] Connection registry: map `manager_id` / `user_id` → WebSocket session
- [ ] `src/events/consumer.js` — consume events and push to relevant connected sessions
  - [ ] `CONTENT_CREATED` → push to manager session
  - [ ] `MANAGER_APPROVED` → push to client session
  - [ ] `CLIENT_FEEDBACK` → push to manager session
  - [ ] `CONTENT_APPROVED` → push to manager session
  - [ ] `CONTENT_REJECTED` → push to manager session
  - [ ] `POST_PUBLISHED` → push to manager + client sessions
- [ ] Emit `POST_STATUS_UPDATED` WebSocket message (matches frontend hook's expected event type)
- [ ] Emit `POST_SENT_TO_CLIENT` WebSocket message (matches `ClientView` hook)
- [ ] Dockerfile
- [ ] docker-compose entry with `rabbitmq` dependency

---

### notification-service (port 5007) — ❌ Not started
- [ ] Project folder (`services/notification-service/`)
- [ ] Express app, `src/routes/`, `src/services/`, `src/db/`, `src/events/` structure
- [ ] `notif_db` schema: `notifications` (id, user_id, manager_id, type, body, read, created_at)
- [ ] `src/events/consumer.js` — consume relevant events and persist notifications
  - [ ] `CONTENT_CREATED` → notify manager
  - [ ] `CLIENT_FEEDBACK` → notify manager
  - [ ] `CONTENT_APPROVED` → notify manager + client
  - [ ] `CONTENT_REJECTED` → notify manager
  - [ ] `POST_PUBLISHED` → notify manager + client
- [ ] `GET /notifications` — fetch in-app notifications for authenticated user
- [ ] `PATCH /notifications/:id/read` — mark notification as read
- [ ] Email dispatch integration (provider TBD: SendGrid / SES)
- [ ] Dockerfile
- [ ] docker-compose entry with `notif-db` + `rabbitmq` dependency

---

### scheduler-service (port 5008) — [-] Skeleton only
- [x] Project folder exists (`services/scheduler-service/`)
- [-] RabbitMQ consumer exists — consumes `CONTENT_APPROVED`, uses Bull queue for delay
- [-] Bull queue + worker wired — but `sendEvent()` in worker.js is undefined / broken
- [ ] Restructure into `src/routes/`, `src/services/`, `src/db/`, `src/events/`
- [ ] `schedule_db` schema: `schedules` (post_id, manager_id, scheduled_at, status)
- [ ] Consume `CONTENT_APPROVED` → store schedule record in DB
- [ ] `POST /schedule` — set or update scheduled publish time for a post
- [ ] `GET /schedule/:postId` — get schedule for a post
- [ ] Fix `sendEvent()` → proper `src/events/publisher.js` that emits `READY_TO_PUBLISH`
- [ ] Cron / Bull worker to fire `READY_TO_PUBLISH` at the right time
- [ ] Remove broken `setTimeout` / `sendEvent` stub
- [ ] `manager_id` on every schedule record
- [ ] Dockerfile
- [ ] docker-compose entry with `schedule-db` + `rabbitmq` dependency

---

### publisher-service (port 5009) — [-] Stub only
- [x] Project folder exists (`services/publisher-service/`)
- [-] Consumes `READY_TO_PUBLISH`, logs "publishing" — no real API call
- [-] Emits `POST_PUBLISHED` — but payload is missing `project_id` (query service workaround in place)
- [ ] Restructure into `src/services/`, `src/events/`
- [ ] Replace stub with real social media API call (provider TBD: Instagram Graph API, LinkedIn API, Twitter/X API)
- [ ] Proper `channel.ack(msg)` after successful publish
- [ ] Dead-letter / retry on publish failure
- [ ] Dockerfile
- [ ] docker-compose entry with `rabbitmq` dependency

---

## Frontend (port 5173 dev / 3000 prod) — ✅ Core complete

### Pages
- [x] Login page — JWT-based manager login, brand panel, animated form
- [x] Register page — manager account creation
- [x] Dashboard — project grid with per-project accent colors, stats, stagger animation
- [x] Project detail — stats row, posts list, review history, members list
- [x] Create post — AI generation form with platform selector (instagram / linkedin / twitter)
- [x] Post detail — version history, review history, manager review panel
- [x] Client view — posts pending client approval with inline feedback + WebSocket updates

### Components & Infrastructure
- [x] `AppLayout` — sidebar with role-aware navigation (manager vs client nav)
- [x] `ProtectedRoute` — role-based auth guard
- [x] `StatusBadge` — dot-prefix status badges matching dark theme
- [x] `apiClient` — Axios with JWT Bearer token injection
- [x] `useAuth` — Zustand auth store with localStorage persistence
- [x] `useWebSocket` — real-time event hook (depends on realtime-service being built)
- [x] Add member panel in project detail — create new user OR enrol existing user
- [x] Dockerfile + Dockerfile.dev

### Missing / Future
- [ ] Notification bell / in-app notifications (depends on notification-service)
- [ ] Asset upload UI (depends on asset-service)
- [ ] Schedule picker on approved posts (depends on scheduler-service)
- [ ] `POST_STATUS_UPDATED` / `POST_SENT_TO_CLIENT` WebSocket events only work once realtime-service is running

---

## Infrastructure

### docker-compose.dev.yml — [-] Partial
- [x] `rabbitmq` container (management UI on 15672)
- [x] `user-db` with init script, healthcheck
- [x] `content-db` with healthcheck
- [x] `query-db` with healthcheck
- [x] `user-service` with all env vars
- [x] `content-service` with all env vars
- [x] `query-service` with all env vars
- [x] `api-gateway` with all service URLs
- [x] `frontend` service
- [ ] `review-db` + `review-service`
- [ ] `asset-db` + `asset-service`
- [ ] `query-db` init script (currently initialized by code; should use SQL file for consistency)
- [ ] `realtime-service`
- [ ] `notif-db` + `notification-service`
- [ ] `schedule-db` + `scheduler-service`
- [ ] `publisher-service`

### DB Init Scripts (`docker/init/`)
- [x] `user-db.sql` — managers, users, projects, project_members
- [ ] `content-db.sql` — posts, post_versions, templates, prompts, asset_cache
- [ ] `review-db.sql` — reviews, approval_state
- [ ] `asset-db.sql` — assets
- [ ] `query-db.sql` — projects_view, posts_map
- [ ] `notif-db.sql` — notifications
- [ ] `schedule-db.sql` — schedules

### Environment
- [ ] `.env.example` at repo root with all required vars documented
  - JWT_SECRET, RABBITMQ_URL
  - AI image generation API key + endpoint
  - S3 bucket + credentials
  - Social media API keys (Instagram, LinkedIn, Twitter/X)
  - Email provider API key (SendGrid / SES)

### RabbitMQ Messaging
- [x] Topic exchange `wingman.events` used by user-service, content-service, query-service
- [x] Named durable queues per service
- [x] `{ persistent: true }` on published messages
- [x] `channel.ack` / `channel.nack` in consumers
- [x] `RABBITMQ_URL` env var used (no hardcoded localhost)
- [ ] Dead-letter queue setup for failed message handling
- [ ] review-service, scheduler-service, publisher-service need to migrate to topic exchange pattern

### Multi-Tenant Isolation
- [x] `manager_id` on all tables in user-service and content-service
- [x] `manager_id` filter on all DB queries in user-service and content-service
- [x] API Gateway injects `x-manager-id` from JWT on every forwarded request
- [ ] Same isolation to be enforced in review-service, asset-service, notification-service, scheduler-service

---

## Next Service to Build

**review-service** — it's the critical path blocker. Without it:
- `POST /api/review/:id` returns 502 (no service behind the gateway route)
- The entire post lifecycle (draft → manager_review → client_review → approved) is broken
- `MANAGER_APPROVED`, `CLIENT_FEEDBACK`, `CONTENT_APPROVED`, `CONTENT_REJECTED` events are never emitted
- query-service stat counters (`posts_in_review`, `posts_approved`) never update
- scheduler-service never receives `CONTENT_APPROVED` to trigger scheduling
