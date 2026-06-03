# DevReview AI — Backend Specification

This document is the **single source of truth** for the DevReview AI backend.
It describes every endpoint, data model, queue, integration, and environment
variable required for the frontend (see `FRONTEND.md`) to work end‑to‑end.

> Stack: **Node.js 20 + Express 4 + TypeScript** · **Supabase (Postgres + Auth + Storage + Realtime)** · **BullMQ + Redis** for jobs · **OpenAI / Anthropic / Lovable AI Gateway** for LLM calls · **Octokit** for GitHub · **grammy** for Telegram · **Docker** for the in‑browser IDE runners.

---

## 1. Project layout

```
backend/
├── src/
│   ├── index.ts                  # Express bootstrap, middleware, route mount
│   ├── config/
│   │   ├── env.ts                # zod‑validated env loader
│   │   ├── supabase.ts           # admin + anon clients
│   │   ├── redis.ts              # ioredis + BullMQ connection
│   │   └── logger.ts             # pino
│   ├── middleware/
│   │   ├── auth.ts               # verifies Supabase JWT → req.user
│   │   ├── requireOrg.ts         # resolves workspace + role
│   │   ├── rateLimit.ts          # per‑user / per‑IP buckets
│   │   ├── error.ts              # central error handler
│   │   └── audit.ts              # writes to audit_logs
│   ├── modules/
│   │   ├── auth/                 # login, signup, oauth, sessions
│   │   ├── workspaces/           # orgs, members, invites, billing
│   │   ├── projects/             # repos, branches, files
│   │   ├── reviews/              # AI code review pipeline
│   │   ├── pullRequests/         # PR sync + AI comments
│   │   ├── devops/               # Dockerfile / CI / k8s generation
│   │   ├── agents/               # AI agents directory + chat
│   │   ├── editor/               # online IDE, file IO, exec, AI composer
│   │   ├── github/               # OAuth app + webhooks
│   │   ├── telegram/             # bot + linking + notifications
│   │   ├── templates/            # starter templates
│   │   ├── notifications/        # in‑app + email + push
│   │   ├── apiKeys/              # personal access tokens
│   │   ├── audit/                # SOC‑2 style event log
│   │   ├── billing/              # Stripe customer + subscriptions
│   │   ├── analytics/            # dashboards + reports
│   │   └── webhooks/             # outbound + inbound dispatch
│   ├── workers/
│   │   ├── review.worker.ts
│   │   ├── devops.worker.ts
│   │   ├── github.worker.ts
│   │   ├── telegram.worker.ts
│   │   └── notifications.worker.ts
│   ├── services/
│   │   ├── ai/                   # llm.ts, prompts/, tools/
│   │   ├── git/                  # clone, diff, blob
│   │   ├── sandbox/              # docker exec for IDE
│   │   └── storage/              # signed URLs
│   ├── lib/
│   │   ├── crypto.ts             # secret encryption (AES‑256‑GCM)
│   │   ├── http.ts               # typed Express helpers
│   │   └── pagination.ts
│   └── types/
│       └── api.ts                # shared request/response types (exported to FE)
├── prisma/  OR  supabase/migrations/
└── tests/
```

---

## 2. Conventions

- **Base URL**: `/api/v1`
- **Auth**: `Authorization: Bearer <supabase_access_token>` on every request
  except `/auth/*` and `/webhooks/*`. Middleware injects `req.user`,
  `req.workspaceId`, `req.role`.
- **Tenancy**: every resource is scoped by `workspace_id`. Cross‑workspace
  reads are forbidden — enforced both in queries AND with Supabase RLS.
- **IDs**: UUID v4 everywhere.
- **Timestamps**: ISO 8601 UTC (`created_at`, `updated_at`, `deleted_at`).
- **Pagination**: cursor based — `?cursor=...&limit=20` → `{ data, nextCursor }`.
- **Filtering**: `?status=open&severity=high&q=search`.
- **Errors**: RFC 7807 problem+json
  ```json
  { "type":"about:blank", "title":"Not Found", "status":404, "detail":"Project xyz not found", "code":"project_not_found" }
  ```
- **Streaming**: AI endpoints use `text/event-stream` (SSE) with Vercel AI SDK
  data‑stream protocol so the frontend `useChat` / `useCompletion` works.
- **Idempotency**: mutating endpoints accept `Idempotency-Key` header.
- **Rate limits**: 60 req/min anonymous, 600 req/min per user, 30 req/min
  per AI endpoint, per workspace burst quotas on top.

---

## 3. Environment variables

```
# core
NODE_ENV=production
PORT=4000
APP_URL=https://app.devreview.ai
API_URL=https://api.devreview.ai

# supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

# database (direct, for migrations / workers)
DATABASE_URL=

# redis / queues
REDIS_URL=

# AI providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
LOVABLE_API_KEY=
DEFAULT_REVIEW_MODEL=openai/gpt-5
DEFAULT_CHAT_MODEL=google/gemini-3-flash-preview

# github app
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_CLIENT_ID=
GITHUB_APP_CLIENT_SECRET=
GITHUB_WEBHOOK_SECRET=

# telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=

# stripe billing
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_FREE=
STRIPE_PRICE_PRO=
STRIPE_PRICE_TEAM=
STRIPE_PRICE_ENTERPRISE=

# sandbox / IDE runners
DOCKER_HOST=unix:///var/run/docker.sock
SANDBOX_IMAGE=ghcr.io/devreview/sandbox-node:latest
SANDBOX_TIMEOUT_MS=30000

# storage
S3_ENDPOINT=
S3_BUCKET=devreview-artifacts
S3_ACCESS_KEY=
S3_SECRET_KEY=

# crypto
SECRET_ENCRYPTION_KEY=   # 32‑byte base64, used to encrypt integration tokens

# email
RESEND_API_KEY=
EMAIL_FROM=DevReview AI <noreply@devreview.ai>
```

---

## 4. Database schema (Supabase / Postgres)

All tables: `id uuid pk default gen_random_uuid()`, `created_at timestamptz`,
`updated_at timestamptz`, `deleted_at timestamptz null`. RLS enabled on every
table; policies always check `workspace_id` against the caller's memberships
(via a `has_workspace_role(workspace_id, role)` SECURITY DEFINER function).

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | extends `auth.users` | `id`, `display_name`, `avatar_url`, `default_workspace_id` |
| `workspaces` | tenant root | `name`, `slug`, `plan`, `stripe_customer_id` |
| `workspace_members` | membership + role | `workspace_id`, `user_id`, `role` (`owner`/`admin`/`member`/`viewer`) |
| `workspace_invites` | pending invites | `email`, `role`, `token`, `expires_at` |
| `projects` | analyzed repos | `workspace_id`, `name`, `github_repo_id`, `default_branch`, `health_score`, `visibility` |
| `project_environments` | dev/staging/prod | `project_id`, `name`, `variables` jsonb |
| `repositories` | git metadata | `project_id`, `provider` (`github`), `external_id`, `clone_url` |
| `branches` | tracked branches | `project_id`, `name`, `head_sha` |
| `commits` | indexed commits | `project_id`, `sha`, `author`, `message` |
| `pull_requests` | mirror of upstream PRs | `project_id`, `number`, `title`, `state`, `base_sha`, `head_sha`, `ai_status` |
| `reviews` | AI review run | `project_id`, `pr_id` nullable, `commit_sha`, `status`, `score`, `model`, `started_at`, `finished_at` |
| `review_findings` | issues found by AI | `review_id`, `file_path`, `line_start`, `line_end`, `severity`, `category`, `title`, `description`, `suggestion`, `auto_fix` jsonb |
| `devops_artifacts` | generated configs | `project_id`, `type` (`dockerfile`/`compose`/`gha`/`k8s`/`terraform`), `content`, `prompt`, `model` |
| `agents` | AI agent definitions | `workspace_id` nullable (null = system), `slug`, `name`, `system_prompt`, `tools` jsonb |
| `agent_sessions` | chat threads | `agent_id`, `user_id`, `title`, `context` jsonb |
| `agent_messages` | UIMessage rows | `session_id`, `role`, `parts` jsonb, `model`, `tokens` |
| `editor_sessions` | online IDE sessions | `project_id`, `user_id`, `container_id`, `expires_at` |
| `editor_files` | virtual file overrides | `session_id`, `path`, `content`, `language` |
| `editor_commands` | terminal history | `session_id`, `cmd`, `stdout`, `stderr`, `exit_code` |
| `github_installations` | GitHub App | `workspace_id`, `installation_id`, `account_login`, `account_type` |
| `github_repos_linked` | linked repos | `installation_id`, `project_id`, `full_name`, `private` |
| `telegram_links` | bot ↔ user | `user_id`, `workspace_id`, `chat_id`, `username`, `verified` |
| `templates` | starter templates | `slug`, `name`, `stack`, `tags`, `repo_url`, `usage_count` |
| `template_instances` | created from template | `template_id`, `project_id`, `user_id` |
| `api_keys` | personal tokens | `user_id`, `workspace_id`, `name`, `prefix`, `hashed_key`, `scopes`, `last_used_at`, `expires_at` |
| `webhooks` | outbound webhooks | `workspace_id`, `url`, `secret`, `events`, `active` |
| `webhook_deliveries` | delivery log | `webhook_id`, `event`, `status_code`, `response_body`, `attempt` |
| `notifications` | in‑app inbox | `user_id`, `workspace_id`, `type`, `title`, `body`, `link`, `read_at` |
| `notification_preferences` | per‑channel toggles | `user_id`, `channel` (`email`/`telegram`/`inapp`), `event`, `enabled` |
| `audit_logs` | SOC‑2 trail | `workspace_id`, `actor_id`, `action`, `target_type`, `target_id`, `ip`, `ua`, `metadata` |
| `subscriptions` | Stripe state | `workspace_id`, `stripe_subscription_id`, `plan`, `status`, `current_period_end` |
| `usage_meters` | metered billing | `workspace_id`, `metric` (`reviews`/`ai_tokens`/`builds`), `period`, `count` |
| `invoices` | mirror of Stripe | `workspace_id`, `stripe_invoice_id`, `amount`, `status`, `pdf_url` |
| `secrets_vault` | encrypted integration secrets | `workspace_id`, `name`, `ciphertext`, `iv`, `tag` |

---

## 5. REST API

> Every endpoint is prefixed with `/api/v1`. `🔒` = auth required.
> `👑` = workspace `owner`/`admin` only. SSE endpoints return
> `text/event-stream`.

### 5.1 Auth (`/auth`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/signup` | email + password signup → returns session |
| POST | `/auth/login` | email + password login |
| POST | `/auth/logout` 🔒 | revoke refresh token |
| POST | `/auth/refresh` | exchange refresh token for new access token |
| POST | `/auth/forgot-password` | send reset email |
| POST | `/auth/reset-password` | consume reset token, set new password |
| GET | `/auth/oauth/:provider/start` | begin GitHub/Google/Apple OAuth |
| GET | `/auth/oauth/:provider/callback` | exchange code, create profile, redirect to app |
| GET | `/auth/me` 🔒 | current user + memberships |
| POST | `/auth/verify-email` | confirm email token |
| POST | `/auth/2fa/enroll` 🔒 | TOTP setup, returns QR seed |
| POST | `/auth/2fa/verify` 🔒 | confirm TOTP code |
| DELETE | `/auth/2fa` 🔒 | disable 2FA |

### 5.2 Workspaces (`/workspaces`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/workspaces` 🔒 | list workspaces for user |
| POST | `/workspaces` 🔒 | create workspace (onboarding step 1) |
| GET | `/workspaces/:id` 🔒 | workspace details + plan + counters |
| PATCH | `/workspaces/:id` 🔒👑 | rename / change slug / settings |
| DELETE | `/workspaces/:id` 🔒👑 | soft delete |
| GET | `/workspaces/:id/members` 🔒 | list members |
| POST | `/workspaces/:id/members/invite` 🔒👑 | invite by email |
| POST | `/workspaces/:id/members/accept` 🔒 | accept invite by token |
| PATCH | `/workspaces/:id/members/:userId` 🔒👑 | change role |
| DELETE | `/workspaces/:id/members/:userId` 🔒👑 | remove member |
| GET | `/workspaces/:id/usage` 🔒 | reviews / tokens / builds for current period |
| POST | `/workspaces/:id/onboarding/complete` 🔒 | mark onboarding finished |

### 5.3 Projects (`/projects`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/projects` 🔒 | list with filters (`status`, `q`, `tag`) |
| POST | `/projects` 🔒 | create empty project |
| POST | `/projects/import` 🔒 | import from GitHub repo `{ installationId, repoId }` |
| POST | `/projects/from-template` 🔒 | create from `{ templateSlug, name }` |
| GET | `/projects/:id` 🔒 | full project incl. latest review + health |
| PATCH | `/projects/:id` 🔒 | update name, visibility, tags |
| DELETE | `/projects/:id` 🔒👑 | delete |
| GET | `/projects/:id/branches` 🔒 | branches with status |
| GET | `/projects/:id/commits` 🔒 | recent commits |
| GET | `/projects/:id/files?ref=&path=` 🔒 | file tree at ref |
| GET | `/projects/:id/blob?ref=&path=` 🔒 | raw file content |
| GET | `/projects/:id/environments` 🔒 | env list |
| POST | `/projects/:id/environments` 🔒👑 | create env |
| PATCH | `/projects/:id/environments/:envId` 🔒👑 | update vars (encrypted) |

### 5.4 Code Review (`/reviews`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/reviews?projectId=` 🔒 | list reviews |
| POST | `/reviews` 🔒 | trigger new review `{ projectId, ref, paths?, model? }` → enqueues `review` job, returns `{ id, status:"queued" }` |
| GET | `/reviews/:id` 🔒 | review summary + score |
| GET | `/reviews/:id/findings?severity=` 🔒 | findings list, paginated |
| GET | `/reviews/:id/stream` 🔒 (SSE) | live progress + token stream |
| POST | `/reviews/:id/findings/:findingId/apply` 🔒 | apply suggested patch to a branch or PR |
| POST | `/reviews/:id/findings/:findingId/dismiss` 🔒 | mark false positive (feeds RLHF) |
| POST | `/reviews/:id/cancel` 🔒 | cancel running review |
| GET | `/reviews/:id/report.pdf` 🔒 | export PDF |

### 5.5 Pull Requests (`/pull-requests`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/pull-requests?projectId=&state=` 🔒 | list PRs |
| GET | `/pull-requests/:id` 🔒 | PR detail incl. AI status |
| POST | `/pull-requests/:id/review` 🔒 | run AI review on this PR |
| POST | `/pull-requests/:id/comment` 🔒 | post AI summary as PR comment on GitHub |
| POST | `/pull-requests/:id/approve` 🔒 | (if user permits) auto‑approve when score ≥ threshold |
| POST | `/pull-requests/:id/request-changes` 🔒 | post changes requested |
| GET | `/pull-requests/:id/diff` 🔒 | unified diff |

### 5.6 DevOps generator (`/devops`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/devops/generate` 🔒 (SSE) | `{ projectId, type, options }` streams generated file |
| GET | `/devops/artifacts?projectId=` 🔒 | history |
| GET | `/devops/artifacts/:id` 🔒 | single artifact |
| POST | `/devops/artifacts/:id/commit` 🔒 | open PR adding the file to the repo |
| POST | `/devops/validate` 🔒 | lint Dockerfile / compose / k8s manifest |

### 5.7 AI Agents (`/agents`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/agents` 🔒 | list system + custom agents |
| POST | `/agents` 🔒 | create custom agent `{ name, systemPrompt, tools, model }` |
| GET | `/agents/:id` 🔒 | agent details |
| PATCH | `/agents/:id` 🔒 | edit |
| DELETE | `/agents/:id` 🔒 | delete custom agent |
| GET | `/agents/:id/sessions` 🔒 | thread list |
| POST | `/agents/:id/sessions` 🔒 | create thread |
| GET | `/agents/sessions/:sessionId/messages` 🔒 | message history (UIMessage[]) |
| POST | `/agents/sessions/:sessionId/messages` 🔒 (SSE) | send message → streams reply (Vercel AI SDK protocol) |
| DELETE | `/agents/sessions/:sessionId` 🔒 | delete thread |

### 5.8 Online Editor / IDE (`/editor`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/editor/sessions` 🔒 | start container for `{ projectId, ref }` → `{ sessionId, wsUrl }` |
| GET | `/editor/sessions/:id` 🔒 | session info, expiry |
| DELETE | `/editor/sessions/:id` 🔒 | terminate container |
| GET | `/editor/sessions/:id/tree` 🔒 | full file tree |
| GET | `/editor/sessions/:id/file?path=` 🔒 | read file |
| PUT | `/editor/sessions/:id/file` 🔒 | write file `{ path, content }` |
| DELETE | `/editor/sessions/:id/file?path=` 🔒 | delete file |
| POST | `/editor/sessions/:id/move` 🔒 | rename `{ from, to }` |
| POST | `/editor/sessions/:id/exec` 🔒 (SSE) | run shell cmd, stream stdout/stderr |
| POST | `/editor/sessions/:id/format` 🔒 | run formatter on a file |
| POST | `/editor/sessions/:id/lint` 🔒 | run linter, return problems |
| POST | `/editor/sessions/:id/commit` 🔒 | git commit + push |
| POST | `/editor/sessions/:id/ai/chat` 🔒 (SSE) | Cursor‑style composer; body includes active file context, returns Vercel AI SDK stream. Apply‑edit tool calls emit `{ type:"file_patch", path, content }` events the frontend uses to write the file. |
| POST | `/editor/sessions/:id/ai/inline` 🔒 (SSE) | inline ⌘K transform `{ path, selection, instruction }` |
| WS | `wss://api/editor/sessions/:id/ws` 🔒 | terminal PTY + collaborative cursors |

### 5.9 GitHub integration (`/github`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/github/app/install-url` 🔒 | URL to install the GitHub App |
| GET | `/github/installations` 🔒 | installations available to workspace |
| GET | `/github/installations/:id/repos` 🔒 | repos for installation |
| POST | `/github/installations/:id/link` 🔒 | link repo → project |
| DELETE | `/github/installations/:id` 🔒👑 | uninstall |
| POST | `/webhooks/github` (public) | GitHub App webhook receiver — verifies HMAC, enqueues `github` worker for `push`, `pull_request`, `installation`, `check_run`, `workflow_run` events |

### 5.10 Telegram integration (`/telegram`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/telegram/link/start` 🔒 | issue one‑time code `{ code, botDeepLink }` |
| POST | `/telegram/link/verify` 🔒 | confirm link from chat |
| DELETE | `/telegram/link` 🔒 | unlink |
| GET | `/telegram/status` 🔒 | bot health, last delivery |
| POST | `/telegram/test` 🔒 | send test message to user |
| PATCH | `/telegram/preferences` 🔒 | toggle which events go to Telegram |
| POST | `/webhooks/telegram` (public) | Telegram bot webhook — handles `/start <code>`, `/review <repo>`, `/agents`, button callbacks |

### 5.11 Templates (`/templates`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/templates?stack=&q=` | list (public) |
| GET | `/templates/:slug` | detail |
| POST | `/templates/:slug/use` 🔒 | create project from template (also covered above) |
| POST | `/templates` 🔒👑 | submit custom template (admin) |

### 5.12 Notifications (`/notifications`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/notifications?unread=true` 🔒 | inbox |
| POST | `/notifications/read` 🔒 | `{ ids: [] }` mark read |
| POST | `/notifications/read-all` 🔒 | mark all read |
| GET | `/notifications/preferences` 🔒 | per‑channel matrix |
| PATCH | `/notifications/preferences` 🔒 | update prefs |
| GET | `/notifications/stream` 🔒 (SSE) | live push (alternative to Supabase Realtime) |

### 5.13 API keys (`/api-keys`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api-keys` 🔒 | list (no plaintext) |
| POST | `/api-keys` 🔒 | create `{ name, scopes, expiresAt? }` → returns `{ key }` once |
| DELETE | `/api-keys/:id` 🔒 | revoke |
| POST | `/api-keys/:id/rotate` 🔒 | rotate, returns new plaintext |

### 5.14 Webhooks (outbound) (`/webhooks`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/webhooks` 🔒 | list |
| POST | `/webhooks` 🔒👑 | create |
| PATCH | `/webhooks/:id` 🔒👑 | edit |
| DELETE | `/webhooks/:id` 🔒👑 | delete |
| GET | `/webhooks/:id/deliveries` 🔒 | delivery log |
| POST | `/webhooks/:id/test` 🔒 | send ping event |

### 5.15 Audit log (`/audit`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/audit?actor=&action=&from=&to=` 🔒👑 | query log |
| GET | `/audit/export.csv` 🔒👑 | export CSV |

### 5.16 Billing (`/billing`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/billing/plans` | public plan catalog |
| GET | `/billing/subscription` 🔒 | current plan + usage |
| POST | `/billing/checkout` 🔒👑 | create Stripe Checkout session for plan upgrade |
| POST | `/billing/portal` 🔒👑 | create Stripe billing portal session |
| GET | `/billing/invoices` 🔒👑 | list invoices |
| POST | `/webhooks/stripe` (public) | Stripe webhook — verifies signature, updates `subscriptions` / `invoices` |

### 5.17 Analytics / Reports (`/analytics`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/analytics/overview` 🔒 | KPIs for dashboard cards |
| GET | `/analytics/quality?projectId=&period=30d` 🔒 | trend chart data |
| GET | `/analytics/activity?from=&to=` 🔒 | activity timeline |
| GET | `/analytics/agents` 🔒 | agent usage breakdown |
| GET | `/analytics/devops` 🔒 | builds + deploys metrics |
| GET | `/analytics/export.csv?report=` 🔒👑 | CSV export |

### 5.18 Settings (`/settings`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/settings/profile` 🔒 | current user profile |
| PATCH | `/settings/profile` 🔒 | name, avatar, locale |
| POST | `/settings/avatar` 🔒 | multipart upload → S3 signed URL |
| GET | `/settings/security` 🔒 | sessions, 2FA, recent logins |
| POST | `/settings/sessions/:id/revoke` 🔒 | kill a session |
| GET | `/settings/workspace` 🔒👑 | workspace settings |
| PATCH | `/settings/workspace` 🔒👑 | update |
| GET | `/settings/integrations` 🔒 | GitHub + Telegram + custom |
| GET | `/settings/secrets` 🔒👑 | secret names only |
| POST | `/settings/secrets` 🔒👑 | add `{ name, value }` (encrypted) |
| DELETE | `/settings/secrets/:name` 🔒👑 | remove |

### 5.19 Search & misc

| Method | Path | Purpose |
|---|---|---|
| GET | `/search?q=&type=` 🔒 | global search across projects, files, PRs, agents |
| GET | `/health` | liveness probe |
| GET | `/ready` | readiness (db + redis + queues) |
| GET | `/version` | git sha, build time |

---

## 6. Background workers (BullMQ queues)

| Queue | Trigger | Job |
|---|---|---|
| `review` | `POST /reviews`, GitHub PR webhook | clone → diff → LLM review → write `review_findings` → notify |
| `devops` | `POST /devops/generate` | LLM stream → store artifact → optional PR |
| `github.sync` | webhook | sync repo metadata, PR state, commits |
| `telegram.send` | notification fan‑out | deliver Telegram messages |
| `notifications.dispatch` | any event | fan‑out to inapp / email / telegram per prefs |
| `webhooks.deliver` | event bus | sign + POST outbound webhooks with retries |
| `editor.reaper` | cron 1m | kill expired sandbox containers |
| `usage.aggregate` | cron 5m | roll up `usage_meters` into Stripe |
| `billing.sync` | Stripe webhook | reconcile subscriptions/invoices |
| `audit.flush` | every request | batched insert into `audit_logs` |

---

## 7. Realtime channels (Supabase Realtime or WS gateway)

| Channel | Payload |
|---|---|
| `workspace:{id}:notifications` | new notification |
| `project:{id}:reviews` | review status updates |
| `review:{id}:findings` | new finding while review streams |
| `pr:{id}` | PR status / AI comment posted |
| `editor:{sessionId}` | terminal output, file changes, presence |
| `agent:{sessionId}` | streamed assistant tokens (when not using SSE) |

---

## 8. AI service layer (`services/ai`)

- `llm.ts` — provider‑agnostic wrapper using Vercel AI SDK
  (`streamText`, `generateText`, `Output.object`). Default model resolution:
  `req.user → workspace → env`.
- `prompts/` — versioned system prompts per agent (Review, DevOps, Architect,
  Docs, Editor Composer). Each prompt file exports `{ id, version, system, fewShot }`.
- `tools/` — typed AI SDK tools the agents can call:
  - `apply_file_patch({ path, content })` — emits to client + writes to sandbox
  - `read_file({ path })`
  - `search_code({ query })`
  - `run_command({ cmd })` (requires `needsApproval`)
  - `open_pull_request({ branch, title, body, files })`
  - `post_pr_comment({ prId, body })`
  - `create_issue({ title, body, labels })`
  - `send_telegram({ chatId, text })`
- `safety.ts` — prompt‑injection scrubber, secret redactor, max‑token guard.
- Costs / tokens recorded into `usage_meters`.

---

## 9. Security

- Supabase RLS on every table, plus server‑side `requireOrg` middleware.
- Tokens (GitHub, Telegram, third‑party) stored in `secrets_vault` encrypted
  with `SECRET_ENCRYPTION_KEY` (AES‑256‑GCM, per‑row IV + auth tag).
- All webhooks verify HMAC signatures (GitHub `x-hub-signature-256`,
  Stripe `stripe-signature`, Telegram secret token, custom outbound uses
  `x-devreview-signature: sha256=...`).
- API keys hashed with Argon2id; only the prefix stored in clear for UI.
- 2FA TOTP via `otpauth`; backup codes hashed.
- CORS: allow `APP_URL` + custom domains, credentials true.
- CSRF: not needed for pure bearer auth; cookies (if used for OAuth) are
  `SameSite=Lax; Secure; HttpOnly`.
- Audit every mutating endpoint (middleware).
- Rate limit by `(user_id, route)` and `(ip, route)`.

---

## 10. Deployment

- **API**: Fly.io / Render / Railway, Node 20, 2 vCPU baseline, autoscale.
- **Workers**: same image, different entrypoint (`node dist/workers/<name>.js`).
- **Sandbox runners**: dedicated host pool with Docker‑in‑Docker, per‑session
  containers limited to 512 MB / 0.5 vCPU, no network egress except npm
  registry mirror.
- **Database**: Supabase managed Postgres + Storage + Realtime.
- **Redis**: Upstash or managed.
- **CDN**: Cloudflare in front of `API_URL`.
- **CI/CD**: GitHub Actions → build image → push GHCR → deploy.

---

## 11. Frontend ↔ Backend contract

The Express app exposes a TypeScript types package at
`backend/src/types/api.ts` that the frontend imports as `@devreview/api-types`.
Every response/request shape used by the frontend MUST live there so
TanStack Query + React forms stay type‑safe. Example:

```ts
export type Review = {
  id: string;
  projectId: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  score: number | null;
  model: string;
  startedAt: string;
  finishedAt: string | null;
  findingsCount: { critical: number; high: number; medium: number; low: number };
};
```

Streaming endpoints emit Vercel AI SDK data‑stream events so
`useChat({ api: "/api/v1/agents/sessions/:id/messages" })` works without
custom parsing.

---

## 12. Roadmap hooks (not built yet, but reserve the surface)

- `/automations` — recipe builder ("when PR opened and score < 70, notify Telegram")
- `/insights/security` — SAST + dependency scanning results
- `/cloud/deploys` — one‑click deploys to Vercel / Fly / Railway
- `/copilot/voice` — voice‑driven coding sessions
- `/marketplace/agents` — share / install community agents

When implementing these, add the routes under the same `/api/v1` namespace
and follow the conventions in §2.

---

_Keep this file in sync with the actual Express routes. If an endpoint
changes shape, update both the route handler and this document in the same
PR._
