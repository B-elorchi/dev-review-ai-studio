export const stats = [
  { label: "Total Projects", value: "24", delta: "+3 this week", icon: "folder" },
  { label: "Reviews Executed", value: "1,284", delta: "+128 today", icon: "check" },
  { label: "Generated Pipelines", value: "342", delta: "+12 this week", icon: "rocket" },
  { label: "Active Agents", value: "4", delta: "All online", icon: "bot" },
];

export const activity = [
  { type: "review", title: "Review completed on auth-service", time: "2m ago", severity: "success" },
  { type: "pr", title: "Pull request #482 analyzed", time: "14m ago", severity: "info" },
  { type: "docker", title: "Dockerfile generated for payments-api", time: "1h ago", severity: "info" },
  { type: "k8s", title: "Kubernetes manifest generated", time: "3h ago", severity: "info" },
  { type: "review", title: "Critical vulnerability detected in user-svc", time: "5h ago", severity: "destructive" },
  { type: "agent", title: "Architect Agent suggested refactor", time: "8h ago", severity: "warning" },
];

export const qualityTrend = [
  { day: "Mon", quality: 78, security: 82, debt: 34 },
  { day: "Tue", quality: 80, security: 84, debt: 32 },
  { day: "Wed", quality: 83, security: 81, debt: 30 },
  { day: "Thu", quality: 85, security: 86, debt: 28 },
  { day: "Fri", quality: 84, security: 88, debt: 26 },
  { day: "Sat", quality: 87, security: 89, debt: 24 },
  { day: "Sun", quality: 89, security: 91, debt: 22 },
];

export const projects = [
  { id: "auth-service", name: "auth-service", description: "OAuth2 / JWT authentication microservice", language: "TypeScript", lastAnalysis: "2 hours ago", score: 92 },
  { id: "payments-api", name: "payments-api", description: "Stripe payment orchestration", language: "Go", lastAnalysis: "1 day ago", score: 87 },
  { id: "user-svc", name: "user-svc", description: "User profile and preferences service", language: "Python", lastAnalysis: "3 hours ago", score: 64 },
  { id: "web-frontend", name: "web-frontend", description: "Next.js customer portal", language: "TypeScript", lastAnalysis: "5 hours ago", score: 88 },
  { id: "data-pipeline", name: "data-pipeline", description: "ETL with Airflow + dbt", language: "Python", lastAnalysis: "2 days ago", score: 76 },
  { id: "mobile-app", name: "mobile-app", description: "React Native iOS/Android app", language: "TypeScript", lastAnalysis: "6 hours ago", score: 81 },
];

export const findings = [
  {
    severity: "critical" as const,
    title: "SQL Injection vulnerability",
    description: "User input is concatenated directly into a SQL query in getUserById().",
    recommendation: "Use parameterized queries or an ORM with prepared statements.",
    fix: `const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);`,
    file: "src/controllers/user.ts:42",
  },
  {
    severity: "high" as const,
    title: "Missing rate limiting on login endpoint",
    description: "/auth/login has no rate limit, allowing brute-force attacks.",
    recommendation: "Add express-rate-limit or equivalent middleware (5 attempts / 15min).",
    fix: `app.use('/auth/login', rateLimit({ windowMs: 15*60*1000, max: 5 }));`,
    file: "src/routes/auth.ts:12",
  },
  {
    severity: "medium" as const,
    title: "Unused dependency: lodash",
    description: "lodash is imported but never used in this file.",
    recommendation: "Remove the unused import to reduce bundle size.",
    fix: `// remove: import _ from 'lodash';`,
    file: "src/services/payment.ts:3",
  },
  {
    severity: "low" as const,
    title: "Inconsistent naming convention",
    description: "Variable getUserId mixes camelCase with snake_case elsewhere.",
    recommendation: "Adopt camelCase consistently across the module.",
    fix: `const getUserId = ...`,
    file: "src/utils/helpers.ts:88",
  },
];

export const agents = [
  { id: "review", name: "Code Reviewer", description: "Reviews PRs, finds bugs, vulnerabilities, and code smells.", status: "online", color: "from-blue-500 to-cyan-500", icon: "shield-check" },
  { id: "devops", name: "DevOps Agent", description: "Generates Dockerfiles, CI/CD pipelines, and Kubernetes manifests.", status: "online", color: "from-purple-500 to-pink-500", icon: "rocket" },
  { id: "architect", name: "Architect Agent", description: "Designs system architecture and suggests refactors.", status: "online", color: "from-amber-500 to-orange-500", icon: "compass" },
  { id: "docs", name: "Documentation Agent", description: "Writes READMEs, API docs, and inline documentation.", status: "online", color: "from-emerald-500 to-teal-500", icon: "book" },
];

export const repos = [
  { name: "acme/auth-service", branch: "main", lastReview: "2h ago", status: "passing", prs: 3 },
  { name: "acme/payments-api", branch: "main", lastReview: "1d ago", status: "passing", prs: 1 },
  { name: "acme/user-svc", branch: "develop", lastReview: "3h ago", status: "failing", prs: 5 },
  { name: "acme/web-frontend", branch: "main", lastReview: "5h ago", status: "passing", prs: 2 },
];

export const telegramMessages = [
  { from: "user", text: "/review acme/auth-service", time: "10:42" },
  { from: "bot", text: "🔍 Starting review on acme/auth-service@main...", time: "10:42" },
  { from: "bot", text: "✅ Review complete!\n• 0 critical\n• 2 high\n• 4 medium\n\nQuality score: 92/100", time: "10:43" },
  { from: "user", text: "/deploy payments-api staging", time: "10:45" },
  { from: "bot", text: "🚀 Deploying payments-api to staging...\nBuild #482 started.", time: "10:45" },
];

export const fileTree = [
  {
    name: "src", type: "folder", children: [
      { name: "controllers", type: "folder", children: [
        { name: "auth.ts", type: "file", lang: "typescript" },
        { name: "user.ts", type: "file", lang: "typescript" },
      ]},
      { name: "services", type: "folder", children: [
        { name: "token.service.ts", type: "file", lang: "typescript" },
      ]},
      { name: "routes", type: "folder", children: [
        { name: "index.ts", type: "file", lang: "typescript" },
      ]},
      { name: "index.ts", type: "file", lang: "typescript" },
    ]
  },
  { name: "package.json", type: "file", lang: "json" },
  { name: "Dockerfile", type: "file", lang: "dockerfile" },
  { name: "README.md", type: "file", lang: "markdown" },
];

export const sampleFiles: Record<string, { lang: string; content: string }> = {
  "src/index.ts": {
    lang: "typescript",
    content: `import express from 'express';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/user';

const app = express();
app.use(express.json());

app.use('/auth', authRouter);
app.use('/users', userRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`🚀 auth-service listening on :\${PORT}\`);
});
`,
  },
  "src/controllers/auth.ts": {
    lang: "typescript",
    content: `import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { signToken } from '../services/token.service';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await db.users.findByEmail(email);
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const token = signToken({ sub: user.id, email: user.email });
  return res.json({ token });
}
`,
  },
  "Dockerfile": {
    lang: "dockerfile",
    content: `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
`,
  },
  "package.json": {
    lang: "json",
    content: `{
  "name": "auth-service",
  "version": "1.4.2",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
`,
  },
};
