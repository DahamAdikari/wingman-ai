# Wingman AI — Event Reference

All inter-service communication happens via RabbitMQ on the `wingman.events` topic exchange. Services never call each other directly — events are the only channel.

---

## Quick Reference

| Event | Producer | Consumers | Trigger |
|---|---|---|---|
| `CONTENT_CREATED` | Content Service | Query, Realtime, Notification | New post version generated (first or revision) |
| `ASSET_UPLOADED` | Asset Service | Content Service | Manager uploads a brand asset (logo, template, prompt) |
| `MANAGER_APPROVED` | Review Service | Query, Realtime, Notification | Manager approves content → moves to client review |
| `CLIENT_FEEDBACK` | Review Service | Content Service, Query, Realtime, Notification | Client requests changes on a post |
| `CONTENT_APPROVED` | Review Service | Query, Realtime, Scheduler | Both manager and client have approved |
| `CONTENT_REJECTED` | Review Service | Content Service, Query, Realtime | Manager or client hard-rejects a post |
| `READY_TO_PUBLISH` | Scheduler Service | Publisher Service | Scheduled publish time reached |
| `POST_PUBLISHED` | Publisher Service | Query, Realtime, Notification | Post successfully sent to social media |

---

## Events In Detail

---

### `CONTENT_CREATED`

**Producer:** Content Service  
**Consumers:** Query Service, Realtime Service, Notification Service

**When it fires:**  
Every time Content Service finishes generating (or regenerating) a post version — whether it's the first draft or a revision triggered by feedback. Fires after the post version is saved to `content_db`.

**What consumers do with it:**
- **Query Service** — increments `total_posts` and updates `last_post_status` in `projects_view`
- **Realtime Service** — pushes a live status update to the manager's browser session
- **Notification Service** — sends the manager a "New content is ready for review" notification

**Payload:**
```json
{
  "event": "CONTENT_CREATED",
  "post_id": "uuid",
  "post_version_id": "uuid",
  "project_id": "uuid",
  "manager_id": "uuid",
  "platform": "instagram",
  "caption_text": "...",
  "image_url": "https://s3.example.com/image.jpg",
  "timestamp": "2026-04-23T10:00:00Z"
}
```

---

### `ASSET_UPLOADED`

**Producer:** Asset Service  
**Consumers:** Content Service

**When it fires:**  
When a manager uploads a brand asset (logo, template, or prompt text) through the Asset Service. Fires after the asset file is stored in S3 and the record is saved to `asset_db`.

**What consumers do with it:**
- **Content Service** — caches the asset reference (ID + URL) into its own `asset_cache` table in `content_db`. This local cache is used at generation time to attach logos and apply brand templates to AI-generated content. The content service never queries `asset_db` directly — the cache is the only source.

**Payload:**
```json
{
  "event": "ASSET_UPLOADED",
  "asset_id": "uuid",
  "manager_id": "uuid",
  "project_id": "uuid or null",
  "type": "logo",
  "file_url": "https://s3.example.com/logo.png",
  "timestamp": "2026-04-23T10:00:00Z"
}
```

> `project_id` is `null` when the asset applies to all of the manager's projects (e.g. a global brand logo).  
> `type` values: `'logo'` | `'template'` | `'prompt'`

---

### `MANAGER_APPROVED`

**Producer:** Review Service  
**Consumers:** Query Service, Realtime Service, Notification Service

**When it fires:**  
When the manager approves a post version in the review workflow. After this event, the post moves to `client_review` status and the client can see it.

**What consumers do with it:**
- **Query Service** — increments `posts_in_review` and updates `last_post_status`
- **Realtime Service** — pushes live update to manager and client sessions
- **Notification Service** — notifies the assigned client that content is awaiting their review

**Payload:**
```json
{
  "event": "MANAGER_APPROVED",
  "post_id": "uuid",
  "post_version_id": "uuid",
  "project_id": "uuid",
  "manager_id": "uuid",
  "timestamp": "2026-04-23T10:05:00Z"
}
```

---

### `CLIENT_FEEDBACK`

**Producer:** Review Service  
**Consumers:** Content Service, Query Service, Realtime Service, Notification Service

**When it fires:**  
When the client requests changes on a post (soft rejection with feedback text). The post is sent back for AI regeneration with the feedback attached as revision notes.

**What consumers do with it:**
- **Content Service** — calls `regenerateContent` with the `feedback_text` as `revision_notes`. Generates a new caption using the feedback as context and a new image using the original image prompt. Emits `CONTENT_CREATED` when done.
- **Query Service** — stores `feedback_text` snippet in `last_feedback_snippet`, updates status
- **Realtime Service** — pushes live update to manager session
- **Notification Service** — notifies the manager that "Client requested changes"

**Payload:**
```json
{
  "event": "CLIENT_FEEDBACK",
  "post_id": "uuid",
  "post_version_id": "uuid",
  "project_id": "uuid",
  "manager_id": "uuid",
  "client_id": "uuid",
  "feedback_text": "Please make the tone more formal",
  "timestamp": "2026-04-23T10:10:00Z"
}
```

---

### `CONTENT_APPROVED`

**Producer:** Review Service  
**Consumers:** Query Service, Realtime Service, Scheduler Service

**When it fires:**  
When both the manager and the client have approved the post. The post moves to `approved` status and is ready to be scheduled for publishing.

**What consumers do with it:**
- **Query Service** — increments `posts_approved`, updates status
- **Realtime Service** — pushes live update to manager and client sessions
- **Scheduler Service** — creates a schedule record in `schedule_db`. Waits until `scheduled_at` and then emits `READY_TO_PUBLISH`

**Payload:**
```json
{
  "event": "CONTENT_APPROVED",
  "post_id": "uuid",
  "post_version_id": "uuid",
  "project_id": "uuid",
  "manager_id": "uuid",
  "timestamp": "2026-04-23T10:20:00Z"
}
```

---

### `CONTENT_REJECTED`

**Producer:** Review Service  
**Consumers:** Content Service, Query Service, Realtime Service

**When it fires:**  
When the manager or client hard-rejects a post (not a request for changes — a full rejection). The post is sent back for AI regeneration, identical in flow to `CLIENT_FEEDBACK` but semantically distinct (hard stop vs. revision request).

**What consumers do with it:**
- **Content Service** — calls `regenerateContent` with the `feedback_text` as revision context (same handler path as `CLIENT_FEEDBACK`)
- **Query Service** — updates `last_post_status` to `rejected`
- **Realtime Service** — pushes live update to manager session

**Payload:**
```json
{
  "event": "CONTENT_REJECTED",
  "post_id": "uuid",
  "project_id": "uuid",
  "manager_id": "uuid",
  "rejected_by": "manager",
  "feedback_text": "The image is completely off-brand",
  "timestamp": "2026-04-23T10:15:00Z"
}
```

> `rejected_by` values: `'manager'` | `'client'`

---

### `READY_TO_PUBLISH`

**Producer:** Scheduler Service  
**Consumers:** Publisher Service

**When it fires:**  
When the scheduled publish time (`scheduled_at`) for an approved post is reached. The Scheduler Service polls or uses a job queue to fire this at the right moment.

**What consumers do with it:**
- **Publisher Service** — calls the appropriate social media API (Instagram, LinkedIn, Twitter) with the post content and emits `POST_PUBLISHED` on success

**Payload:**
```json
{
  "event": "READY_TO_PUBLISH",
  "post_id": "uuid",
  "post_version_id": "uuid",
  "manager_id": "uuid",
  "platform": "instagram",
  "scheduled_at": "2026-04-24T09:00:00Z",
  "timestamp": "2026-04-24T09:00:00Z"
}
```

---

### `POST_PUBLISHED`

**Producer:** Publisher Service  
**Consumers:** Query Service, Realtime Service, Notification Service

**When it fires:**  
When the Publisher Service has successfully posted the content to the external social media platform and received a confirmation response.

**What consumers do with it:**
- **Query Service** — increments `posts_published`, updates `last_post_status` to `published`
- **Realtime Service** — pushes live update to manager and client sessions
- **Notification Service** — notifies both manager and client that "Your post has been published"

**Payload:**
```json
{
  "event": "POST_PUBLISHED",
  "post_id": "uuid",
  "manager_id": "uuid",
  "platform": "instagram",
  "published_at": "2026-04-24T09:00:05Z",
  "external_post_id": "abc123",
  "timestamp": "2026-04-24T09:00:05Z"
}
```

> `external_post_id` is the ID returned by the social media platform's API (used for linking back to the live post).

---

## RabbitMQ Setup

```
Exchange: wingman.events  (topic exchange, durable)
```

Each service declares its own **durable named queue** and binds it to the events it cares about. Using a durable named queue (not an exclusive auto-delete queue) ensures messages are not lost if the service restarts.

```js
// Template — events/publisher.js
channel.publish(
  'wingman.events',
  eventName,                          // routing key = event name
  Buffer.from(JSON.stringify(payload)),
  { persistent: true }
);

// Template — events/consumer.js
await channel.assertQueue('my-service-queue', { durable: true });
await channel.bindQueue('my-service-queue', 'wingman.events', 'EVENT_NAME');
```

---

## Post Lifecycle — Events View

```
POST /content (API Gateway → Content Service)
  → Content Service generates caption + image
  → saves to content_db
  → emits CONTENT_CREATED
      → Query Service updates dashboard counts
      → Notification Service alerts manager

Manager reviews and approves in UI
  → Review Service records decision
  → emits MANAGER_APPROVED
      → Query Service updates status
      → Notification Service alerts client

Client reviews and approves in UI
  → Review Service records decision
  → emits CONTENT_APPROVED
      → Scheduler Service creates schedule record

[at scheduled_at time]
  → Scheduler Service emits READY_TO_PUBLISH
      → Publisher Service calls social media API
      → emits POST_PUBLISHED
          → Query Service marks published
          → Notification Service alerts manager + client

[if client requests changes at any point]
  → Review Service emits CLIENT_FEEDBACK
      → Content Service regenerates
      → emits CONTENT_CREATED  ← loop back to top
```
