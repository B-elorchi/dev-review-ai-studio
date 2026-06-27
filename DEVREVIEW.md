# DevReview AI — Project Overview (read this first)

This is the **canonical, AI-readable brief** for the whole DevReview AI
platform. Any AI agent (or human) working on this codebase should read this
file before touching anything else. It links out to the two deep specs:

- `FRONTEND.md` — UI conventions, routing, design system, every screen.
- `BACKEND.md` — Express API, schema, queues, integrations, env vars.

---

## 1. What we are building

**DevReview AI** is an AI-native developer platform that combines:

1. **AI code review** — runs on commits / PRs, returns scored findings with
   suggested patches.
2. **DevOps generator** — produces Dockerfiles, docker-compose, GitHub
   Actions, Kubernetes, Terraform from a project description (SSE-streamed).
3. **Multi-agent workflows** — a directory of specialized AI agents
   (Architect, Security, DBA, DevOps, QA, Product…) with chat threads + tools.
4. **Online IDE** — VS Code-style workspace (Monaco editor + file tree +
   terminal + AI composer) running on Docker sandboxes.
5. **GitHub + Telegram integrations** — App webhooks for repo events;
   Telegram bot for notifications and chat ops.
6. **Workspace platform** — multi-tenant orgs, members/roles, API keys,
   billing (Stripe), audit log, notifications, analytics.

The platform is sold as a SaaS with Free / Pro / Team / Enterprise tiers.

---

## 2. Architecture at a glance

```text
┌──────────────────────────┐        HTTPS / SSE / WS        ┌──────────────────────────┐
│  Frontend (this repo)    │ ─────────────────────────────► │  Backend (devreview-     │
│  TanStack Start v1       │                                │  backend, separate repo) │
│  React 19 + Vite 7       │ ◄───────────────────────────── │  Express 4 + TS          │
│  Tailwind v4 + shadcn    │      JSON / event-stream       │  Supabase (Pg+Auth+Stg)  │
│  Monaco IDE              │                                │  BullMQ + Redis workers  │
└──────────┬───────────────┘                                │  Docker sandboxes (IDE)  │
           │                                                │  GitHub App / Telegram   │
           │ Supabase JS client (auth + realtime)           │  Stripe billing          │
           └──────────────────────────────────────────────► │  OpenAI / Anthropic /    │
                                                            │  Lovable AI Gateway      │
                                                            └──────────────────────────┘
```

- The **frontend** is the repo you're in. Routing is file-based under
  `src/routes/`. It currently runs on mock data (`src/lib/mock-data.ts`)
  and is being wired to the backend route by route.
- The **backend** lives in a separate repo (`devreview-backend`,
  scaffolded as `/mnt/documents/devreview-backend-v2.zip`). It exposes
  `/api/v1/*` REST + SSE + WebSocket endpoints, documented at `/api-docs`
  (Swagger UI generated from `src/openapi.ts`).
- Both sides share Supabase as the system of record. The frontend uses the
  Supabase JS SDK for auth + realtime; the backend uses the service role
  client + RLS-bound user clients for everything else.

---

## 3. Tech stack (both sides)

| Concern        | Frontend                               | Backend                                  |
| -------------- | -------------------------------------- | ---------------------------------------- |
| Language       | TypeScript (strict)                    | TypeScript (strict)                      |
| Framework      | TanStack Start v1 (React 19 + Vite 7)  | Express 4 (Node 20)                      |
| Routing        | File-based (`src/routes/`)             | Module routers under `src/modules/*`     |
| Styling / UI   | Tailwind v4, shadcn/ui, lucide-react   | —                                        |
| State / data   | TanStack Query + zustand               | Supabase + Postgres                      |
| Editor         | `@monaco-editor/react`                 | Docker sandboxes + PTY (`node-pty`)      |
| AI             | Vercel AI SDK (`ai`, `useChat`)        | `ai` + `@ai-sdk/openai-compatible`       |
| Charts / anim  | Recharts, CSS, optional framer-motion  | —                                        |
| Auth           | Supabase JS                            | Supabase JWT verification (`jose`)       |
| Queues         | —                                      | BullMQ + Redis                           |
| Integrations   | —                                      | Octokit (GitHub), grammy (Telegram),     |
|                |                                        | Stripe, Resend                           |
| Docs           | This file + `FRONTEND.md`              | `BACKEND.md` + Swagger at `/api-docs`    |

---

## 4. How the two sides talk

1. **Auth** — the frontend signs the user in via Supabase. Every backend
   request carries `Authorization: Bearer <supabase_access_token>` and
   `x-workspace-id: <uuid>` so the backend can resolve tenancy + role.
2. **Reads** — TanStack Query against `/api/v1/*` JSON endpoints, cursor
   pagination (`?cursor&limit` → `{ data, nextCursor }`).
3. **Writes** — same endpoints; mutations accept `Idempotency-Key`.
4. **AI streams** — SSE endpoints (Vercel AI SDK data-stream protocol) so
   `useChat` / `useCompletion` work without adapters. Used by:
   `/reviews/:id/stream`, `/devops/generate`, `/agents/sessions/:id/messages`,
   `/editor/sessions/:id/ai/chat`, `/editor/sessions/:id/ai/inline`.
5. **IDE terminal + presence** — WebSocket at
   `wss://api/editor/sessions/:id/ws` (PTY + cursors).
6. **Realtime** — Supabase Realtime channels for `notifications`,
   `reviews`, `pull_requests` row changes.
7. **Webhooks (inbound)** — GitHub (`/webhooks/github`) and Telegram
   (`/webhooks/telegram`) verify HMAC then enqueue BullMQ jobs.
8. **Errors** — RFC 7807 problem+json (`{ type, title, status, detail, code }`).

---

## 5. Repo map (frontend, this repo)

See `FRONTEND.md §2` for the full tree and §8 for every screen. Quick map:

```
src/
├── routes/              # File-based routes (URL = filename, dots = slashes)
│   ├── __root.tsx       # App shell (sidebar + topnav + <Outlet/>)
│   ├── index.tsx        # / dashboard
│   ├── auth.tsx         # /auth (fullscreen)
│   ├── onboarding.tsx   # /onboarding (fullscreen)
│   ├── projects.$id.tsx # /projects/:id  → IDE workspace
│   └── … one file per screen (pull-requests, code-review, devops,
│          agents, templates, github, telegram, notifications, reports,
│          team, api-keys, billing, audit-log, settings)
├── components/          # ui/ (shadcn), app-sidebar, top-nav, page-header,
│                          code-editor (Monaco wrapper)
├── lib/                 # mock-data.ts, utils.ts, api/ (server fn stubs),
│                          ai-gateway.server.ts
├── hooks/, styles.css, router.tsx, start.ts, server.ts
```

**Hard rules (from FRONTEND.md §7):**

- File-based routing only — no `src/pages/`, no `react-router-dom`.
- Never edit `src/routeTree.gen.ts` (auto-generated).
- Semantic Tailwind tokens only (`bg-background`, `text-foreground`,
  `bg-primary`, …). No hard-coded hex / `bg-black` / `text-white`.
- Cards use the `.glass` utility.
- Fullscreen routes must be listed in `__root.tsx`'s `isFullScreen` guard.
- All icons via `lucide-react`.

---

## 6. Repo map (backend, separate repo)

See `BACKEND.md §1` for the full tree and §5 for every endpoint. Quick map:

```
backend/
├── src/
│   ├── index.ts              # Express bootstrap + Swagger UI
│   ├── openapi.ts            # OpenAPI 3.0 spec (served at /api-docs)
│   ├── config/               # env (zod), supabase, redis, logger
│   ├── middleware/           # auth, requireOrg, rateLimit, error, audit
│   ├── modules/              # auth, workspaces, projects, reviews,
│   │                           pullRequests, devops, agents, editor,
│   │                           github, telegram, templates,
│   │                           notifications, apiKeys, audit, billing,
│   │                           analytics, webhooks
│   ├── workers/              # review/devops/github/telegram/notifications
│   ├── services/             # ai/, git/, sandbox/, storage/
│   └── lib/                  # crypto (AES-256-GCM), http, pagination
├── supabase/migrations/      # 0001_init.sql + RLS policies
├── Dockerfile, docker-compose.yml
└── README.md
```

**Hard rules (from BACKEND.md §2):**

- Base URL `/api/v1`.
- Every resource scoped by `workspace_id`; enforced in queries AND RLS.
- UUID v4 IDs, ISO 8601 UTC timestamps, cursor pagination.
- AI endpoints stream SSE (Vercel AI SDK protocol).
- Roles stored in `workspace_members` only — never on `profiles`. Use the
  `has_workspace_role(workspace_id, role)` SECURITY DEFINER function in RLS.
- Integration secrets are AES-256-GCM encrypted in `secrets_vault`; API
  keys are Argon2id-hashed in `api_keys`.

---

## 7. Domain model (shared mental model)

```
auth.users ──┐
             ▼
          profiles ──── workspace_members ──► workspaces ──► subscriptions / usage_meters / invoices
                                              │
                                              ├── projects ──► branches / commits / pull_requests
                                              │                    │
                                              │                    └── reviews ──► review_findings
                                              │
                                              ├── agents ──► agent_sessions ──► agent_messages
                                              │
                                              ├── editor_sessions ──► editor_files / editor_commands
                                              │
                                              ├── github_installations ──► github_repos_linked
                                              ├── telegram_links
                                              ├── api_keys / webhooks / webhook_deliveries
                                              ├── notifications / notification_preferences
                                              ├── audit_logs
                                              └── secrets_vault
```

`workspace_id` is the tenancy boundary on every table. `user_id` is the
actor inside a workspace. Roles: `owner` / `admin` / `member` / `viewer`.

---

## 8. Screens ↔ endpoints (where each page gets its data)

| Frontend route       | Primary backend calls                                                   |
| -------------------- | ----------------------------------------------------------------------- |
| `/`                  | `GET /workspaces/:id/usage`, `GET /reviews?recent`, `GET /projects`     |
| `/auth`              | Supabase JS (`signInWithPassword`, OAuth)                               |
| `/onboarding`        | `POST /workspaces`, `POST /github/app/install-url`, `POST /workspaces/:id/onboarding/complete` |
| `/projects`          | `GET /projects`, `POST /projects/import`, `POST /projects/from-template` |
| `/projects/:id`      | `GET /projects/:id`, `POST /editor/sessions`, SSE `/editor/.../ai/chat` |
| `/pull-requests`     | `GET /pull-requests`, `POST /pull-requests/:id/review`                  |
| `/code-review`       | `GET /reviews/:id`, `GET /reviews/:id/findings`, SSE `/reviews/:id/stream` |
| `/devops`            | SSE `POST /devops/generate`, `GET /devops/artifacts`                    |
| `/agents`            | `GET /agents`, `POST /agents/:id/sessions`, SSE `POST /agents/sessions/:id/messages` |
| `/templates`         | `GET /templates`, `POST /projects/from-template`                        |
| `/github`            | `GET /github/installations`, `POST /github/installations/:id/link`      |
| `/telegram`          | `POST /telegram/link/start`, `POST /telegram/test`                      |
| `/notifications`     | `GET /notifications`, `PATCH /notification-preferences`                 |
| `/reports`           | `GET /analytics/*`                                                      |
| `/team`              | `GET/POST /workspaces/:id/members*`                                     |
| `/api-keys`          | `GET/POST/DELETE /api-keys`                                             |
| `/billing`           | `GET /workspaces/:id/usage`, Stripe portal redirect                     |
| `/audit-log`         | `GET /audit-logs`                                                       |
| `/settings`          | `PATCH /workspaces/:id`, `PATCH /auth/me`, 2FA endpoints                |

---

## 9. AI usage policy

- **Default chat model**: `google/gemini-3-flash-preview` via the Lovable
  AI Gateway (`LOVABLE_API_KEY`). Used for IDE composer, agent chat,
  inline ⌘K edits.
- **Default review model**: `openai/gpt-5` via the gateway. Used for the
  code-review pipeline (`reviews.worker.ts`).
- **Streaming protocol**: always Vercel AI SDK `toUIMessageStreamResponse`
  so the frontend's `useChat` works unchanged.
- **System prompts** live in `backend/src/services/ai/prompts/`. The IDE
  composer prompt (already implemented in
  `src/routes/api/editor-chat.ts`) is the reference shape: it injects the
  active file path / language / content and tells the model to return the
  full updated file in a single fenced block so the UI can offer "Apply".

---

## 10. When you (the AI agent) make changes

1. **Read this file first**, then the relevant spec (`FRONTEND.md` or
   `BACKEND.md`).
2. **Frontend tasks** — stay in `src/`. Add a route file, wire mock data
   first if the backend endpoint isn't ready, then swap to TanStack Query
   against `/api/v1/*`. Respect every rule in `FRONTEND.md §7`.
3. **Backend tasks** — they happen in the separate `devreview-backend`
   repo, not here. If asked to change backend behavior from inside this
   repo, update `BACKEND.md` and call it out — don't add Express code to
   the frontend.
4. **Cross-cutting tasks** (new feature end-to-end) — define the endpoint
   in `BACKEND.md` first, then build the UI against it.
5. **Never** introduce `react-router-dom`, `src/pages/`, hard-coded
   colors, or unauthenticated mutating endpoints.

That's the whole platform in one file. For specifics, jump to
`FRONTEND.md` or `BACKEND.md`.
