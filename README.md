# Wingman AI

> An AI-powered distributed marketing SaaS platform that automates content creation, multi-stage review, and scheduled publishing — built for marketing agencies managing multiple clients through a real-time collaborative web interface.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-in%20development-orange.svg)]()
[![Architecture](https://img.shields.io/badge/architecture-microservices-blueviolet.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Services](#services)
- [Review & Approval Flow](#review--approval-flow)
- [Data Strategy](#data-strategy)
- [Event Reference](#event-reference)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

---

## Overview

Wingman AI is a multi-tenant content automation platform built for marketing agencies. Content managers use it to generate AI-assisted social media posts, run them through a structured approval process with clients, and publish them to external platforms — all from a single real-time dashboard.

**Key capabilities:**

- AI-assisted content and caption generation per post
- Two-gate approval workflow — content manager reviews first, then client
- Real-time status updates pushed via WebSocket — no page refresh needed
- Full feedback and revision history preserved per post
- Complete data isolation between tenants via `manager_id`
- Loosely coupled microservices communicating through an event bus

---

## Architecture

The system is organized into five horizontal layers. All frontend traffic enters through the API Gateway — no service is ever called directly by the client.

```
┌──────────────────────────────────────────────────────────────┐
│                      React Dashboard                          │
│           Content managers · Clients · Review UI             │
└───────────────────────────┬──────────────────────────────────┘
                            │ REST
┌───────────────────────────▼──────────────────────────────────┐
│                       API Gateway                             │
│      Auth · Tenant attach (manager_id) · Routing             │
│  Commands → write services  ·  Reads → Query Service         │
└──┬──────┬──────┬──────┬────────┬──────┬───────────────────────┘
   │      │      │      │        │      │  (all via gateway)
┌──▼──┐ ┌─▼──┐ ┌─▼──┐ ┌▼───┐ ┌──▼──┐ ┌▼───────┐
│Cont.│ │Rev.│ │Sch.│ │Pub.│ │Notif│ │  User  │
│ Svc │ │Svc │ │Svc │ │Svc │ │ Svc │ │  Svc   │
└──┬──┘ └─┬──┘ └─┬──┘ └┬───┘ └──┬──┘ └┬───────┘
   │      │      │     │        │      │
┌──▼──────▼──────▼─────▼────────▼──────▼────────────────────────┐
│                     RabbitMQ — Event Bus                        │
│   CONTENT_CREATED · MANAGER_APPROVED · CLIENT_FEEDBACK         │
│   CONTENT_APPROVED · READY_TO_PUBLISH · POST_PUBLISHED         │
└──────────────┬─────────────────────────────┬───────────────────┘
               │                             │
┌──────────────▼──────────────┐  ┌───────────▼─────────────────┐
│      Query Service           │  │      Realtime Service        │
│      (CQRS read model)       │  │      (WebSocket push)        │
│   ┌──────────────────────┐   │  │                              │
│   │       query_db        │   │  │  Pushes directly to         │
│   └──────────────────────┘   │  │  frontend (bypasses GW)     │
└──────────────────────────────┘  └──────────────────────────────┘
```

### Core architectural patterns

| Pattern | Where used | Why |
|---|---|---|
| **Microservices** | Each business capability is an independent service | Independent scaling, deployment, and team ownership |
| **Event-Driven** | All inter-service communication via RabbitMQ | Loose coupling — services never call each other directly |
| **CQRS** | Query Service maintains a dedicated read model | Fast dashboard reads without cross-service joins |
| **API Composition** | Gateway fans out for project detail views | Full history fetched from source-of-truth write DBs |
| **Multi-Tenant** | Every query scoped to `manager_id` | Complete data isolation between agencies |
| **WebSocket** | Realtime Service pushes to browser sessions | Live UI updates without polling |

---

## Services

### API Gateway
Single entry point for all requests from the React Dashboard. Verifies JWT tokens, extracts and attaches `manager_id` to every request, and routes traffic:
- Write commands → appropriate microservice
- `GET /projects` (dashboard reads) → Query Service
- `GET /projects/:id/detail` → parallel fan-out to Content, Review, and User Services (API composition)
- WebSocket handshake → Realtime Service (direct connection, bypasses gateway after handshake)

---

### Content Service
Generates and stores posts. Calls an AI layer (or template engine) to produce captions and post body copy. Every revision — including rejected drafts — is preserved with a version number.

**Database:** `content_db`  
**Emits:** `CONTENT_CREATED`

---

### Review Service
Manages the full two-gate approval lifecycle. Records every feedback comment, approval decision, and rejection from both content managers and clients. The complete audit trail of who approved what and when lives here.

**Database:** `review_db`  
**Emits:** `MANAGER_APPROVED`, `CLIENT_FEEDBACK`, `CONTENT_APPROVED`, `CONTENT_REJECTED`

---

### Scheduler Service
Accepts an approved post and a target publish datetime. Waits until the scheduled time, then emits `READY_TO_PUBLISH` to trigger the Publisher.

**Database:** `schedule_db`  
**Emits:** `READY_TO_PUBLISH`

---

### Publisher Service
This service Listens for `READY_TO_PUBLISH` and calls the relevant external platform APIs (Instagram, LinkedIn, etc.) to publish the post.

**Emits:** `POST_PUBLISHED`

---

### Notification Service
Subscribes to key events and dispatches outbound notifications (email, push) to the relevant party. Stateless — owns no database. Recipient identifiers are included in each event payload.

| Event received | Notification sent | To |
|---|---|---|
| `CONTENT_CREATED` | "New content is ready for your review" | Content manager |
| `CLIENT_FEEDBACK` | "Your client requested changes" | Content manager |
| `CONTENT_APPROVED` | "Your post has been fully approved" | Client |

---

### User Service
Manages users, content managers, clients, and project assignments. Consulted during API composition (detail view) to supply project metadata.

**Database:** `user_db`

---

### Query Service
Subscribes to every event on the bus and maintains `query_db` — a pre-aggregated, denormalized read model built specifically for the dashboard UI. When a manager loads their dashboard, one `SELECT` query returns everything needed: all projects, post counts, current statuses, and last feedback. No joins. No cross-service calls.

> `query_db` is never written to by an API request. It is updated exclusively by incoming RabbitMQ events.

**Database:** `query_db`

---

### Realtime Service
Maintains persistent WebSocket connections with every active browser session. When events arrive from RabbitMQ, it pushes a lightweight status update to the correct connected clients. Stores nothing — purely a connection manager.

---

## Review & Approval Flow

Every post goes through a mandatory two-gate review before it reaches the publisher.

```
  Content created
        │
        ▼
  ┌─────────────┐
  │   Manager   │──── reject (with notes) ────► Content Service regenerates
  │   Reviews   │◄─────────────────────────────────────────────────────────┘
  └──────┬──────┘
         │ approve  →  emit MANAGER_APPROVED  →  notify client
         ▼
  ┌─────────────┐
  │   Client    │──── reject ────► CLIENT_FEEDBACK emitted
  │   Reviews   │◄──────────────── Manager revises → back to Manager Reviews
  └──────┬──────┘
         │ approve  →  emit CONTENT_APPROVED
         ▼
    Scheduler  →  Publisher  →  POST_PUBLISHED
```

**Step by step:**

1. Post created → `CONTENT_CREATED` emitted → content manager notified
2. Manager reviews via web interface
   - **Reject:** leaves notes → Content Service regenerates with notes → loop back to step 2
   - **Approve:** `MANAGER_APPROVED` emitted → client notified
3. Client reviews via web interface
   - **Reject:** `CLIENT_FEEDBACK` emitted → manager notified → manager revises → loop back to step 2
   - **Approve:** `CONTENT_APPROVED` emitted
4. Scheduler picks up approved post → waits for publish time → `READY_TO_PUBLISH`
5. Publisher fires → `POST_PUBLISHED` emitted → dashboard updated

---

## Data Strategy

### Write databases — source of truth

Each service owns its database exclusively. No other service may read from or write to it directly.

| Database | Owner | Contains |
|---|---|---|
| `content_db` | Content Service | All post versions, captions, full revision history |
| `review_db` | Review Service | All feedback, approvals, rejections, full audit trail |
| `schedule_db` | Scheduler Service | Publish datetime per approved post |
| `user_db` | User Service | Users, managers, clients, project assignments |

### Read database — optimised for the UI

| Database | Owner | Contains |
|---|---|---|
| `query_db` | Query Service | Pre-aggregated project and post summary for the dashboard |

### Two read patterns

**Dashboard list — CQRS (fast path)**

```
GET /projects
  → API Gateway
  → Query Service
  → SELECT * FROM projects_view WHERE manager_id = ?
  → Single response, no joins
```

**Project detail — API Composition (full truth)**

```
GET /projects/:id/detail
  → API Gateway fans out in parallel:
      → Content Service  (all post versions + captions)
      → Review Service   (all feedback + approval history)
      → User Service     (project metadata)
  → Gateway assembles and returns unified JSON
```

### Multi-tenant isolation

Every database row carries a `manager_id`. The API Gateway enforces tenant scoping on every inbound request. A manager can never receive data belonging to another tenant.

---

## Event Reference

| Event | Producer | Consumers |
|---|---|---|
| `CONTENT_CREATED` | Content Service | Query Service, Realtime Service, Notification Service |
| `MANAGER_APPROVED` | Review Service | Query Service, Realtime Service, Notification Service |
| `CLIENT_FEEDBACK` | Review Service | Query Service, Realtime Service, Notification Service |
| `CONTENT_APPROVED` | Review Service | Query Service, Realtime Service, Scheduler Service |
| `CONTENT_REJECTED` | Review Service | Query Service, Realtime Service |
| `READY_TO_PUBLISH` | Scheduler Service | Publisher Service |
| `POST_PUBLISHED` | Publisher Service | Query Service, Realtime Service |

---

## Tech Stack

> Stack is not yet finalised. The following are planned technologies.

| Layer | Technology |
|---|---|
| Frontend | React, WebSocket client |
| API Gateway | Node.js / Express |
| Microservices | Node.js / NestJS |
| Message broker | RabbitMQ |
| Write databases | PostgreSQL (one instance per service) |
| Read database | PostgreSQL (`query_db`) |
| Authentication | JWT |
| Containerisation | Docker, Docker Compose |
| Orchestration | Kubernetes *(planned)* |

---

## Getting Started

**Prerequisites:** Docker and Docker Compose

```bash
# 1. Clone the repository
git clone https://github.com/DahamAdikari/wingman-ai.git
cd wingman-ai

# 2. Copy environment variables
cp .env.example .env

# 3. Start all services
docker compose up --build
```

Once running:

| Service | URL |
|---|---|
| React Dashboard | http://localhost:3000 |
| API Gateway | http://localhost:4000 |
| RabbitMQ Management UI | http://localhost:15672 |

> RabbitMQ default credentials: `guest` / `guest`

---

## Project Structure

```
wingman-ai/
├── services/
│   ├── api-gateway/            # Auth, routing, tenant scoping
│   ├── content-service/        # Post generation, revision history
│   ├── review-service/         # Approval workflow, feedback records
│   ├── scheduler-service/      # Publish time management
│   ├── publisher-service/      # External platform integration
│   ├── notification-service/   # Email and push notifications
│   ├── user-service/           # Users, managers, clients, projects
│   ├── query-service/          # CQRS read model (query_db)
│   └── realtime-service/       # WebSocket connection manager
├── frontend/                   # React dashboard
├── docs/
│   └── architecture/           # Architecture decision records
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Contributing

This project is in initial development. Before contributing, read the architecture decisions in [`/docs/architecture`](./docs/architecture).

**Rules for adding or modifying a service:**

1. **Own your data.** A service must never read from or write to another service's database. All cross-service data access happens through events or the API Gateway composition layer.

2. **Communicate via events.** Services do not make direct HTTP calls to each other. All inter-service communication goes through RabbitMQ.

3. **Scope everything to `manager_id`.** Every query that touches tenant data must include a `manager_id` filter. This is non-negotiable.

4. **Include required fields in every event payload.** All events must carry `manager_id`, `timestamp`, and the relevant entity IDs so consumers can process them without additional lookups.

---

## Links

- **Repository:** [github.com/DahamAdikari/wingman-ai](https://github.com/DahamAdikari/wingman-ai)
- **Architecture docs:** [`/docs/architecture`](./docs/architecture) *(coming soon)*
- **Issue tracker:** [github.com/DahamAdikari/wingman-ai/issues](https://github.com/DahamAdikari/wingman-ai/issues)

---

*Initial architecture — subject to change as implementation progresses.*
