# DevReview AI — Frontend Structure Guide (for AI agents & contributors)

This document explains how this codebase is organized so an AI agent (or a new
human contributor) can navigate, extend, and modify the UI without breaking
conventions. Read this **first** before editing any code.

---

## 1. Tech Stack

| Layer            | Choice                                              |
| ---------------- | --------------------------------------------------- |
| Framework        | **TanStack Start v1** (React 19 + Vite 7, SSR-able) |
| Routing          | File-based (`src/routes/`) — auto-generated tree    |
| Styling          | **Tailwind CSS v4** via `src/styles.css`            |
| UI primitives    | **shadcn/ui** (Radix) in `src/components/ui/`       |
| Icons            | `lucide-react`                                      |
| State / data     | `@tanstack/react-query` + local `zustand` stores    |
| Code editor      | `@monaco-editor/react` (wrapped)                    |
| Charts           | `recharts`                                          |
| Animations       | CSS + (optional) `framer-motion`                    |
| Notifications    | `sonner` (toaster)                                  |
| Language         | TypeScript (strict)                                 |

> Do **not** add new routing libraries (no `react-router-dom`). Do **not**
> create `src/pages/` — TanStack uses `src/routes/`.

---

## 2. Folder Layout

```
src/
├── routes/                  # File-based routes (URL = filename)
│   ├── __root.tsx           # Root layout: sidebar + topnav + <Outlet/>
│   ├── index.tsx            # /  → Dashboard
│   ├── auth.tsx             # /auth → fullscreen login/signup (no chrome)
│   ├── onboarding.tsx       # /onboarding → fullscreen wizard
│   ├── projects.tsx         # /projects (parent layout)
│   ├── projects.$id.tsx     # /projects/:id → IDE workspace
│   ├── pull-requests.tsx
│   ├── code-review.tsx
│   ├── devops.tsx
│   ├── agents.tsx
│   ├── templates.tsx
│   ├── github.tsx
│   ├── telegram.tsx
│   ├── notifications.tsx
│   ├── reports.tsx
│   ├── team.tsx
│   ├── api-keys.tsx
│   ├── billing.tsx
│   ├── audit-log.tsx
│   └── settings.tsx
│
├── components/
│   ├── ui/                  # shadcn/ui primitives (DO NOT edit casually)
│   ├── app-sidebar.tsx      # Left navigation
│   ├── top-nav.tsx          # Header (search, workspace switcher, profile)
│   ├── page-header.tsx      # Reusable page title block
│   └── code-editor.tsx      # Monaco wrapper with custom dark theme
│
├── lib/
│   ├── mock-data.ts         # All seed data (projects, findings, charts…)
│   ├── utils.ts             # cn() helper, formatters
│   └── api/                 # Server function stubs (TanStack)
│
├── hooks/                   # Reusable React hooks
├── styles.css               # Tailwind v4 + design tokens (OKLCH)
├── router.tsx               # Router bootstrap (QueryClient injected)
└── start.ts                 # TanStack Start init
```

---

## 3. Routing Rules (CRITICAL)

1. **Filename → URL** — dots map to slashes.
   `projects.$id.tsx` → `/projects/:id`.
2. **Every route** uses `createFileRoute("...")` with the exact route id.
3. **Never edit** `src/routeTree.gen.ts` — Vite plugin regenerates it.
4. **Fullscreen routes** (no sidebar): currently `/auth` and `/onboarding`.
   They are detected in `__root.tsx` via `useRouterState` and bypass the
   `<SidebarProvider>` chrome. Add new fullscreen routes there.
5. **Layout routes** must render `<Outlet />` or children won't appear.
6. **Each shareable route** should set `head: () => ({ meta: [...] })` with
   its own `title` + `description`.

Example skeleton for a new route:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/my-page")({
  head: () => ({ meta: [{ title: "My Page — DevReview AI" }] }),
  component: MyPage,
});

function MyPage() {
  return (
    <div>
      <PageHeader eyebrow="Section" title="My Page" description="..." />
      <div className="p-6">{/* content */}</div>
    </div>
  );
}
```

After adding a route file, also add a nav entry in
`src/components/app-sidebar.tsx` (groups: `nav`, `integrations`, `system`).

---

## 4. Design System

The whole UI is themed via **semantic CSS tokens** defined in
`src/styles.css` using `oklch()`. Never hard-code colors like `bg-black` or
`text-white` in components.

### Use these tokens (Tailwind v4 syntax):

| Token                    | Usage                              |
| ------------------------ | ---------------------------------- |
| `bg-background`          | Page background                    |
| `text-foreground`        | Primary text                       |
| `bg-card` / `text-card-foreground` | Cards                    |
| `bg-muted` / `text-muted-foreground` | Subtle surfaces & hints |
| `bg-primary` / `text-primary-foreground` | Electric-blue accent |
| `bg-accent`              | Magenta complementary accent       |
| `border-border`          | Standard borders                   |
| `bg-destructive`         | Destructive actions                |
| `text-emerald-400`       | Success / online indicators        |

### Signature gradients

- Brand: `bg-gradient-to-r from-primary to-accent` (CTAs, brand mark)
- Glow shadow: `shadow-[0_0_20px_-4px_var(--primary)]`
- Background blobs: large `rounded-full bg-primary/20 blur-3xl`

### Glassmorphism

Use the `.glass` utility class (defined in `styles.css`) for cards. It adds
backdrop blur + subtle border + translucent background. Prefer
`<Card className="glass ...">` over hand-rolled translucency.

### Typography

- Display headings: `font-display` (Space Grotesk)
- Body: default Inter
- Code: `font-mono` (JetBrains Mono)

---

## 5. Component Patterns

### Page shell
Every "inner app" page (rendered inside the sidebar chrome) follows:

```tsx
<div>
  <PageHeader eyebrow="..." title="..." description="..." actions={...} />
  <div className="grid gap-6 p-6">
    {/* content cards */}
  </div>
</div>
```

### Cards
```tsx
<Card className="glass p-5">…</Card>
```

### Buttons
- Primary CTA: `<Button className="bg-gradient-to-r from-primary to-accent">`
- Secondary: `<Button variant="outline">`
- Icon: `<Button size="icon" variant="ghost">`

### Status badges
Use Tailwind opacity tints, never solid colors:
```tsx
<Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
  Paid
</Badge>
```

### Tables
Use `@/components/ui/table` (`Table`, `TableHeader`, `TableRow`, `TableCell`).
Wrap inside a `<Card className="glass p-0">` for consistent framing.

### Forms
- Inputs: `@/components/ui/input`
- Labels: `@/components/ui/label`
- Pair them inside `space-y-1.5` groups.
- Use `relative` wrapper with absolutely-positioned `lucide` icon at
  `left-3 top-1/2 -translate-y-1/2` for icon inputs (see `auth.tsx`).

### Tabs
`Tabs / TabsList / TabsTrigger / TabsContent` — see `notifications.tsx`.

### Dialogs / Modals
`Dialog / DialogContent / DialogHeader` — see `agents.tsx` chat modal.

---

## 6. Data

**There is no live backend yet.** All data is mock data in
`src/lib/mock-data.ts` or inlined at the top of route files (see
`pull-requests.tsx`, `team.tsx`, etc.). When you add a new page:

1. Define typed mock arrays at the top of the route file.
2. Render from those arrays.
3. Later, replace with `createServerFn` calls + TanStack Query.

Do **not** hit external APIs from the client. When backend is added, use
`createServerFn` from `@tanstack/react-start` and call via `useServerFn` +
`useQuery` (see `tanstack-query-integration` knowledge).

---

## 7. Conventions Checklist (before submitting changes)

- [ ] Route file uses correct `createFileRoute("...")` id matching filename.
- [ ] Page has its own `head()` meta (title + description).
- [ ] No hard-coded hex/RGB colors — use semantic tokens.
- [ ] Cards use `.glass` utility.
- [ ] New nav links added to `app-sidebar.tsx` in the right group.
- [ ] Imports use `@/` alias (configured in `tsconfig.json`).
- [ ] No `useEffect`+`fetch` for initial data — use loaders/Query.
- [ ] Fullscreen routes registered in `__root.tsx` `isFullScreen` check.
- [ ] All icons come from `lucide-react`.
- [ ] No `react-router-dom`, no `src/pages/`, no `entry-client.tsx`.

---

## 8. Map of Every Screen

| Route              | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `/`                | Dashboard: stats, activity, quality charts           |
| `/auth`            | Sign-in / sign-up (fullscreen, no sidebar)           |
| `/onboarding`      | 4-step wizard for new workspaces (fullscreen)        |
| `/projects`        | Grid of repos with health scores                     |
| `/projects/:id`    | VS Code-style IDE: explorer + Monaco + agents chat   |
| `/pull-requests`   | List of AI-reviewed PRs across repos                 |
| `/code-review`     | Detailed review with quality ring + findings         |
| `/devops`          | Wizard: Dockerfile, Compose, GH Actions, K8s         |
| `/agents`          | Directory of multi-agent personas + chat modal       |
| `/templates`       | Starter-project gallery (Next.js, FastAPI, RN…)      |
| `/github`          | GitHub integration health & webhooks                 |
| `/telegram`        | Telegram bot config + chat mockup                    |
| `/notifications`   | Inbox + preference toggles                           |
| `/reports`         | Org-wide analytics (Recharts)                        |
| `/team`            | Members, roles, invites                              |
| `/api-keys`        | REST/CLI API key management                          |
| `/billing`         | Plans, usage, payment method, invoices               |
| `/audit-log`       | SOC-2 style event log                                |
| `/settings`        | Tabbed user/workspace settings                       |

---

## 9. Adding a New Feature — Step-by-step

1. **Create the route file** in `src/routes/` (use dots for slashes).
2. **Define mock data** locally or extend `src/lib/mock-data.ts`.
3. **Compose UI** using `PageHeader` + `Card` + shadcn primitives.
4. **Style** with semantic tokens — never raw colors.
5. **Add nav link** in `app-sidebar.tsx`.
6. **(Fullscreen only)** add path to the `isFullScreen` guard in
   `src/routes/__root.tsx`.
7. **Verify** the dev preview renders without console errors.

That's the entire frontend contract. Stick to it and changes will land
consistently.
