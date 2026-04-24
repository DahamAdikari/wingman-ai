# Wingman AI — Implementation TODO

> **Last updated:** 2026-04-24
> **How to update:** Say "update todo list" — Claude Code will re-scan the codebase and refresh this file.

---

## Legend
- `[x]` Done
- `[-]` Partially implemented / skeleton only
- `[ ]` Not started

---

## Services

### api-gateway (port 4000)
- [x] Project folder created (`services/api-gateway/`)
- [x] Express app with `src/` folder structure
- [x] JWT verification middleware (`src/middleware/auth.js`)
- [x] `manager_id` injection from JWT into all forwarded requests (`src/proxy/forward.js`)
- [x] Route: `POST /api/auth/login` → user-service
- [x] Route: `POST /api/auth/register` → user-service
- [x] Route: `POST /api/content` → content-service
- [x] Route: `GET /api/content/:id` → content-service
- [x] Route: `GET /api/projects/:id/posts` → content-service
- [x] Route: `GET /api/projects` → query-service (dashboard read)
- [x] Route: `POST /api/review/:id` → review-service
- [x] Route: `GET /api/assets` → asset-service
- [x] Route: `POST /api/assets` → asset-service
- [x] Route: `GET /api/users` → user-service
- [x] Parallel fan-out for `GET /api/projects/:id/detail` (content + review + user)
- [x] Dockerfile
- [ ] docker-compose entry (in `docker-compose.dev.yml` for now)

---

### user-service (port 5001)
- [x] Project folder created (`services/user-service/`)
- [x] Express app with `src/` folder structure (`routes/`, `services/`, `db/`)
- [x] `user_db` PostgreSQL schema: `managers`, `users`, `projects`, `project_members`
- [x] `POST /auth/register` — manager registration
- [x] `POST /auth/login` — JWT issuance
- [x] `GET /users` — list users for a manager
- [x] `POST /users` — create user (client, team_member, viewer)
- [x] `GET /users/:id` — get single user
- [x] `GET /users/project/:id` — list members for a project (API composition)
- [x] `POST /projects` — create project
- [x] `GET /projects` — list projects for a manager
- [x] `PATCH /projects/:id` — update project name/description/status
- [x] `POST /projects/:id/members` — add member to project
- [x] `manager_id` filter on every DB query
- [x] Dockerfile
- [x] docker-compose entry (`docker-compose.dev.yml` with `user-db` healthcheck dependency)

---

### content-service (port 5002)
- [-] Project folder exists (`services/content-service/`)
- [-] Basic Express server (runs on wrong port 5001 — fix to 5002)
- [-] RabbitMQ connection exists (hardcoded `localhost` — fix to env var)
- [-] `CONTENT_CREATED` event emitted (via direct queue — migrate to topic exchange)
- [ ] Restructure into `src/routes/`, `src/services/`, `src/db/`, `src/events/`
- [ ] `content_db` PostgreSQL schema: `posts`, `post_versions`, `templates`, `prompts`
- [ ] `POST /content` — create post, trigger AI generation
- [ ] `GET /content/:id` — get post by ID
- [ ] `GET /content/project/:id` — get all posts for a project
- [ ] `src/services/imageService.js` — AI image generation API call
- [ ] `src/db/queries.js` — all DB queries with `manager_id` filter
- [ ] `src/events/publisher.js` — topic exchange publisher
- [ ] `src/events/consumer.js` — consume `CLIENT_FEEDBACK`, `CONTENT_REJECTED` for re-generation
- [ ] `manager_id` on every post and version
- [ ] Dockerfile
- [ ] docker-compose entry with `content-db` + `rabbitmq` dependency

---

### asset-service (port 5003)
- [ ] Project folder created (`services/asset-service/`)
- [ ] Express app with `src/` folder structure
- [ ] `asset_db` PostgreSQL schema: `assets`
- [ ] `GET /assets` — list assets for a manager/project
- [ ] `POST /assets` — upload asset (logo, template, prompt)
- [ ] S3 upload integration
- [ ] `src/events/publisher.js` — emit `ASSET_UPLOADED`
- [ ] `manager_id` filter on every DB query
- [ ] Dockerfile
- [ ] docker-compose entry with `asset-db` + `rabbitmq` dependency

---

### review-service (port 5004)
- [-] Project folder exists (`services/review-service/`)
- [-] RabbitMQ consumer exists (simulates auto-approval — replace with real logic)
- [ ] Restructure into `src/routes/`, `src/services/`, `src/db/`, `src/events/`
- [ ] `review_db` PostgreSQL schema: `reviews`, `approval_state`
- [ ] `POST /review/:id` — submit manager or client review decision
- [ ] Manager approval logic → emit `MANAGER_APPROVED`
- [ ] Client approval logic → emit `CONTENT_APPROVED`
- [ ] Client/manager rejection logic → emit `CONTENT_REJECTED`
- [ ] Client feedback/change-request → emit `CLIENT_FEEDBACK`
- [ ] `src/events/publisher.js` — topic exchange publisher
- [ ] Remove auto-approval stub from `index.js`
- [ ] `manager_id` filter on every DB query
- [ ] Dockerfile
- [ ] docker-compose entry with `review-db` + `rabbitmq` dependency

---

### query-service (port 5005)
- [ ] Project folder created (`services/query-service/`)
- [ ] Express app with `src/` folder structure
- [ ] `query_db` PostgreSQL schema: `projects_view`
- [ ] `GET /query/projects` — return denormalised dashboard view
- [ ] `src/events/consumer.js` — consume ALL events and update `projects_view`
  - [ ] `CONTENT_CREATED` → increment post count, update status
  - [ ] `MANAGER_APPROVED` → update review counts
  - [ ] `CLIENT_FEEDBACK` → store last feedback snippet
  - [ ] `CONTENT_APPROVED` → update status
  - [ ] `CONTENT_REJECTED` → update status
  - [ ] `POST_PUBLISHED` → increment published count
- [ ] Dockerfile
- [ ] docker-compose entry with `query-db` + `rabbitmq` dependency

---

### realtime-service (port 5006)
- [ ] Project folder created (`services/realtime-service/`)
- [ ] WebSocket server (no REST routes)
- [ ] JWT-based WebSocket connection auth
- [ ] `src/events/consumer.js` — consume ALL events and push to relevant connected sessions
- [ ] Dockerfile
- [ ] docker-compose entry with `rabbitmq` dependency

---

### notification-service (port 5007)
- [ ] Project folder created (`services/notification-service/`)
- [ ] Express app with `src/` folder structure
- [ ] `notif_db` PostgreSQL schema: `notifications`
- [ ] `src/events/consumer.js` — consume relevant events and create notifications
  - [ ] `CONTENT_CREATED` → notify manager
  - [ ] `CLIENT_FEEDBACK` → notify manager
  - [ ] `CONTENT_APPROVED` → notify client
  - [ ] `CONTENT_REJECTED` → notify manager
  - [ ] `POST_PUBLISHED` → notify manager + client
- [ ] Email dispatch integration (provider TBD)
- [ ] `GET /notifications` — fetch in-app notifications for a user
- [ ] `PATCH /notifications/:id/read` — mark as read
- [ ] Dockerfile
- [ ] docker-compose entry with `notif-db` + `rabbitmq` dependency

---

### scheduler-service (port 5008)
- [-] Project folder exists (`services/scheduler-service/`)
- [-] RabbitMQ consumer exists (5s `setTimeout` stub — replace with real scheduling)
- [ ] Restructure into `src/routes/`, `src/services/`, `src/db/`, `src/events/`
- [ ] `schedule_db` PostgreSQL schema: `schedules`
- [ ] Consume `CONTENT_APPROVED` → store schedule record
- [ ] `POST /schedule` — set or update scheduled publish time
- [ ] Cron/polling mechanism to fire `READY_TO_PUBLISH` at the right time
- [ ] `src/events/publisher.js` — emit `READY_TO_PUBLISH`
- [ ] Remove `setTimeout` stub
- [ ] `manager_id` on every schedule record
- [ ] Dockerfile
- [ ] docker-compose entry with `schedule-db` + `rabbitmq` dependency

---

### publisher-service (port 5009)
- [-] Project folder exists (`services/publisher-service/`)
- [-] RabbitMQ consumer exists (simulates publish — replace with real API call)
- [ ] Restructure into `src/services/`, `src/events/`
- [ ] Replace simulate stub with real social media API call (provider TBD)
- [ ] `src/events/publisher.js` — emit `POST_PUBLISHED`
- [ ] Proper message acknowledgement (`channel.ack(msg)`)
- [ ] Dockerfile
- [ ] docker-compose entry with `rabbitmq` dependency

---

## Frontend (port 3000)
- [ ] React project scaffolded (`frontend/`)
- [ ] Dashboard page — reads from query-service
- [ ] Project detail page — reads via API Gateway fan-out
- [ ] Content review page
- [ ] Client approval page
- [ ] WebSocket client connected to realtime-service
- [ ] JWT-based login flow
- [ ] State management (library TBD)
- [ ] Dockerfile
- [ ] docker-compose entry

---

## Infrastructure

### RabbitMQ Messaging
- [-] RabbitMQ container in docker-compose (exists but minimal)
- [ ] Migrate all services from direct queues to **topic exchange** (`wingman.events`)
- [ ] Named durable queues per service (not exclusive/anonymous queues)
- [ ] `{ persistent: true }` on all published messages
- [ ] `channel.ack(msg)` in all consumers
- [ ] Replace all hardcoded `amqp://localhost` with `RABBITMQ_URL` env var

### docker-compose.yml
- [-] `postgres` container exists (single shared — replace with per-service DBs)
- [-] `rabbitmq` container exists
- [ ] Replace single postgres with 7 separate DB containers: `user-db`, `content-db`, `asset-db`, `review-db`, `query-db`, `notif-db`, `schedule-db`
- [ ] Add all 10 service definitions with correct ports, env vars, and `depends_on`
- [ ] Add `frontend` service definition

### docker-compose.dev.yml ← current dev/testing compose
- [x] `user-db` container with schema init script (`docker/init/user-db.sql`)
- [x] `user-service` with `DATABASE_URL` + `JWT_SECRET`
- [x] `api-gateway` with all service URLs
- [x] Healthcheck on `user-db` so service waits for DB to be ready
- [ ] Add remaining DB containers as each service is built

### DB Init Scripts (`docker/init/`)
- [x] `user-db.sql` — managers, users, projects, project_members
- [ ] `content-db.sql`
- [ ] `asset-db.sql`
- [ ] `review-db.sql`
- [ ] `query-db.sql`
- [ ] `notif-db.sql`
- [ ] `schedule-db.sql`

### Environment
- [ ] `.env.example` file created with all required vars (JWT_SECRET, AI keys, S3, email, social API)

### Multi-Tenant Isolation
- [ ] `manager_id` column on every table in every service DB
- [ ] Every DB query includes `WHERE manager_id = ?`
- [ ] API Gateway injects `manager_id` from JWT on every forwarded request

---

## Cross-Cutting Concerns
- [ ] All services follow `src/routes/`, `src/services/`, `src/db/`, `src/events/` folder structure
- [ ] No service imports from another service
- [ ] No service queries another service's database
- [ ] All inter-service communication via RabbitMQ topic exchange only (except gateway → services HTTP)
