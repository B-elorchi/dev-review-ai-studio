import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronRight, Container, FileCode, Cloud, Boxes, Workflow, Download, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { CodeEditor } from "@/components/code-editor";

export const Route = createFileRoute("/devops")({
  head: () => ({ meta: [{ title: "DevOps Generator — DevReview AI" }] }),
  component: DevOps,
});

const generated = {
  Dockerfile: { lang: "dockerfile", content: `FROM node:20-alpine AS builder
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
USER node
CMD ["node", "dist/index.js"]
` },
  "docker-compose.yml": { lang: "yaml", content: `version: '3.9'
services:
  api:
    build: .
    ports: ["3000:3000"]
    environment:
      - DATABASE_URL=postgres://app:app@db:5432/app
    depends_on: [db]
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app
    volumes: [pgdata:/var/lib/postgresql/data]
volumes: { pgdata: {} }
` },
  "github-actions.yml": { lang: "yaml", content: `name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm test
      - run: npm run build
      - name: DevReview AI scan
        uses: devreview/action@v1
        with: { token: \${{ secrets.DEVREVIEW_TOKEN }} }
` },
  "k8s-deployment.yaml": { lang: "yaml", content: `apiVersion: apps/v1
kind: Deployment
metadata: { name: auth-service }
spec:
  replicas: 3
  selector: { matchLabels: { app: auth-service } }
  template:
    metadata: { labels: { app: auth-service } }
    spec:
      containers:
        - name: api
          image: ghcr.io/acme/auth-service:latest
          ports: [{ containerPort: 3000 }]
          resources:
            limits: { cpu: "500m", memory: "512Mi" }
` },
  "k8s-service.yaml": { lang: "yaml", content: `apiVersion: v1
kind: Service
metadata: { name: auth-service }
spec:
  type: ClusterIP
  selector: { app: auth-service }
  ports:
    - port: 80
      targetPort: 3000
` },
};

const fileIcons = {
  Dockerfile: Container,
  "docker-compose.yml": Boxes,
  "github-actions.yml": Workflow,
  "k8s-deployment.yaml": Cloud,
  "k8s-service.yaml": Cloud,
};

function DevOps() {
  const [step, setStep] = useState(1);
  const [active, setActive] = useState<keyof typeof generated>("Dockerfile");

  return (
    <div>
      <PageHeader
        eyebrow="Wizard"
        title="DevOps Generator"
        description="Generate Dockerfiles, CI/CD pipelines and Kubernetes manifests in seconds."
      />
      <div className="space-y-6 p-6">
        {/* steps */}
        <div className="flex items-center gap-4">
          {[1, 2].map((n) => (
            <div key={n} className="flex items-center gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold ${step >= n ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                {step > n ? <Check className="h-4 w-4" /> : n}
              </div>
              <span className={`text-sm ${step >= n ? "font-medium" : "text-muted-foreground"}`}>
                {n === 1 ? "Project information" : "Generate configuration"}
              </span>
              {n < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {step === 1 ? (
          <Card className="glass p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { label: "Framework", placeholder: "Choose framework", options: ["Express", "FastAPI", "NestJS", "Spring Boot", "Gin"] },
                { label: "Language", placeholder: "Choose language", options: ["TypeScript", "Python", "Go", "Java", "Rust"] },
                { label: "Database", placeholder: "Choose database", options: ["PostgreSQL", "MySQL", "MongoDB", "Redis"] },
                { label: "Deployment Target", placeholder: "Choose target", options: ["Kubernetes", "Docker Swarm", "AWS ECS", "Fly.io", "Vercel"] },
              ].map((f) => (
                <div key={f.label} className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder={f.placeholder} /></SelectTrigger>
                    <SelectContent>{f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setStep(2)} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                <Sparkles className="mr-1.5 h-4 w-4" />Generate
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
            <Card className="glass p-2">
              <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Generated files</div>
              {Object.keys(generated).map((name) => {
                const Icon = fileIcons[name as keyof typeof fileIcons] ?? FileCode;
                return (
                  <button key={name} onClick={() => setActive(name as keyof typeof generated)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted/50 ${active === name ? "bg-primary/15 text-primary" : ""}`}>
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{name}</span>
                  </button>
                );
              })}
            </Card>
            <Card className="glass overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
                <span className="font-mono text-xs">{active}</span>
                <Button variant="ghost" size="sm"><Download className="mr-1.5 h-3.5 w-3.5" />Download</Button>
              </div>
              <div className="h-[520px]">
                <CodeEditor value={generated[active].content} language={generated[active].lang} readOnly />
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
