import { useCallback, useEffect, useRef, useState } from "react";
import { fetchApi } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";

type Line = { type: "cmd" | "out" | "err" | "ok" | "info" | "warn"; text: string };

function parseCommitMsg(cmd: string) {
  return (
    cmd.match(/git\s+commit\s+(?:-[am]\s+)?["']([^"']+)["']/) ??
    cmd.match(/git\s+commit\s+-[am]\s+(\S+)/)
  )?.[1] ?? null;
}

const HELP_LINES: Line[] = [
  { type: "info", text: "─── DevReview Terminal ─────────────────────────────────────────────" },
  { type: "out",  text: "" },
  { type: "info", text: "GIT COMMANDS" },
  { type: "out",  text: "  git status / git status -s      show working tree status" },
  { type: "out",  text: "  git add . / git add <file>      stage changes" },
  { type: "out",  text: '  git commit -m "msg"             commit staged changes' },
  { type: "out",  text: "  git push / git push origin main push to GitHub via API" },
  { type: "out",  text: "  git pull                        fetch latest from GitHub" },
  { type: "out",  text: "  git log [--oneline]             show commit history" },
  { type: "out",  text: "  git diff [file]                 show unstaged changes" },
  { type: "out",  text: "  git branch [-a]                 list branches" },
  { type: "out",  text: "  git checkout -b <branch>        create new branch" },
  { type: "out",  text: "  git remote -v                   show remotes" },
  { type: "out",  text: "  git stash / git stash pop       stash changes" },
  { type: "out",  text: "  git reset --soft HEAD~1         undo last commit" },
  { type: "out",  text: "  git tag <name>                  create a tag" },
  { type: "out",  text: "  git --version                   show version" },
  { type: "out",  text: "" },
  { type: "info", text: "NPM COMMANDS" },
  { type: "out",  text: "  npm install [package]           install dependencies" },
  { type: "out",  text: "  npm run <script>                run a script" },
  { type: "out",  text: "  npm run dev / start / build     common scripts" },
  { type: "out",  text: "  npm test                        run tests" },
  { type: "out",  text: "  npm list / npm outdated         list packages" },
  { type: "out",  text: "  npm audit                       security audit" },
  { type: "out",  text: "  npm init [-y]                   initialise package.json" },
  { type: "out",  text: "  npx <package> [args]            run without installing" },
  { type: "out",  text: "" },
  { type: "info", text: "NODE COMMANDS" },
  { type: "out",  text: "  node --version / node -v        show Node.js version" },
  { type: "out",  text: "  node <file>                     run a JS file" },
  { type: "out",  text: "  node -e \"<code>\"               evaluate inline code" },
  { type: "out",  text: "" },
  { type: "info", text: "SHELL COMMANDS" },
  { type: "out",  text: "  ls [-la] / dir                  list files" },
  { type: "out",  text: "  pwd                             print working directory" },
  { type: "out",  text: "  cat <file>                      print file content" },
  { type: "out",  text: "  echo <text>                     print text" },
  { type: "out",  text: "  whoami / date / env             system info" },
  { type: "out",  text: "  clear / cls                     clear terminal" },
  { type: "out",  text: "" },
  { type: "info", text: "Ctrl+L = clear  |  Ctrl+C = cancel  |  ↑↓ = history" },
  { type: "out",  text: "──────────────────────────────────────────────────────────────────" },
];

export function Terminal({
  sandboxId,
  dirtyPaths = new Set<string>(),
  modifiedFiles = {} as Record<string, string>,
}: {
  sandboxId?: string;
  dirtyPaths?: Set<string>;
  modifiedFiles?: Record<string, string>;
}) {
  const { workspaceId } = useAuthStore();
  const [lines,   setLines]   = useState<Line[]>([
    { type: "info", text: "DevReview Terminal  —  type 'help' to see available commands" },
    { type: "out",  text: "" },
  ]);
  const [input,   setInput]   = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [busy,    setBusy]    = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const cwd = sandboxId ? `~/projects/${sandboxId.slice(0, 8)}` : "~/workspace";
  const append = useCallback((...nl: Line[]) => setLines((l) => [...l, ...nl]), []);

  const runCmd = useCallback(async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    setHistory((h) => [cmd, ...h.filter((x) => x !== cmd)].slice(0, 200));
    setHistIdx(-1);
    append({ type: "cmd", text: `${cwd} $ ${cmd}` });

    // ── help ──────────────────────────────────────────────────────────────────
    if (cmd === "help" || cmd === "--help" || cmd === "-h") {
      append(...HELP_LINES); return;
    }

    // ── clear ─────────────────────────────────────────────────────────────────
    if (cmd === "clear" || cmd === "cls") { setLines([]); return; }

    // ── ls / dir ──────────────────────────────────────────────────────────────
    if (/^(ls|dir)((\s+-\S+)*)$/.test(cmd)) {
      const files = Object.keys(modifiedFiles).filter((f) => !f.startsWith("__"));
      if (!files.length) { append({ type: "out", text: "(empty — select a project first)" }); }
      else {
        const showAll = cmd.includes("-la") || cmd.includes("-l");
        for (const f of files) {
          append({ type: "out", text: showAll ? `  -rw-r--r--  devreview  ${String(modifiedFiles[f]?.length ?? 0).padStart(6)}  ${f}` : `  ${f}` });
        }
      }
      return;
    }

    // ── pwd ───────────────────────────────────────────────────────────────────
    if (cmd === "pwd") { append({ type: "out", text: cwd }); return; }

    // ── whoami ────────────────────────────────────────────────────────────────
    if (cmd === "whoami") { append({ type: "out", text: "devreview-user" }); return; }

    // ── date ──────────────────────────────────────────────────────────────────
    if (cmd === "date") { append({ type: "out", text: new Date().toString() }); return; }

    // ── env ───────────────────────────────────────────────────────────────────
    if (cmd === "env" || cmd === "printenv") {
      append(
        { type: "out", text: "NODE_ENV=development" },
        { type: "out", text: `PROJECT_ID=${sandboxId ?? "(none)"}` },
        { type: "out", text: "EDITOR=devreview" },
      );
      return;
    }

    // ── echo ──────────────────────────────────────────────────────────────────
    if (cmd.startsWith("echo ")) { append({ type: "out", text: cmd.slice(5) }); return; }

    // ── cat ───────────────────────────────────────────────────────────────────
    if (cmd.startsWith("cat ")) {
      const path = cmd.slice(4).trim();
      const content = modifiedFiles[path];
      if (content === undefined) { append({ type: "err", text: `cat: ${path}: No such file` }); }
      else { for (const line of content.split("\n")) append({ type: "out", text: line }); }
      return;
    }

    // ── touch ─────────────────────────────────────────────────────────────────
    if (cmd.startsWith("touch ")) {
      const path = cmd.slice(6).trim();
      append({ type: "info", text: `Created ${path} — open it in the explorer to edit.` });
      return;
    }

    // ── mkdir ─────────────────────────────────────────────────────────────────
    if (cmd.startsWith("mkdir ")) {
      const dir = cmd.replace(/^mkdir\s+-p\s+/, "").replace("mkdir ", "").trim();
      append({ type: "ok", text: `Created directory ${dir}` });
      return;
    }

    // ──────────────────────────────────────────── NODE ────────────────────────

    if (cmd === "node --version" || cmd === "node -v") {
      append({ type: "out", text: "v20.18.0" }); return;
    }

    if (cmd.startsWith("node -e ") || cmd.startsWith("node --eval ")) {
      const code = cmd.replace(/^node\s+(?:-e|--eval)\s+/, "").replace(/^["']|["']$/g, "");
      try {
        // eslint-disable-next-line no-new-func
        const result = new Function(`"use strict"; return (${code})`)();
        if (result !== undefined) append({ type: "out", text: String(result) });
      } catch (e: any) {
        append({ type: "err", text: e.message });
      }
      return;
    }

    if (cmd.startsWith("node ")) {
      const file = cmd.slice(5).trim();
      const content = modifiedFiles[file];
      if (!content) { append({ type: "err", text: `node: cannot open '${file}': No such file` }); return; }
      append({ type: "info", text: `Running ${file} (browser sandbox — side-effects are simulated)` });
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function("console", content);
        const out: string[] = [];
        fn({ log: (...a: any[]) => out.push(a.join(" ")), error: (...a: any[]) => out.push("ERROR: " + a.join(" ")) });
        for (const l of out) append({ type: "out", text: l });
        if (!out.length) append({ type: "out", text: "(script completed with no output)" });
      } catch (e: any) {
        append({ type: "err", text: e.message });
      }
      return;
    }

    // ──────────────────────────────────────────── NPM ─────────────────────────

    if (cmd === "npm --version" || cmd === "npm -v") { append({ type: "out", text: "10.8.2" }); return; }

    if (cmd === "npm init" || cmd === "npm init -y") {
      append({ type: "ok", text: "Initialised package.json in current directory" },
               { type: "info", text: "Use the editor to modify package.json" });
      return;
    }

    if (cmd.startsWith("npm install") || cmd.startsWith("npm i ") || cmd === "npm i") {
      const pkg = cmd.replace(/^npm\s+i(?:nstall)?\s*/, "").trim();
      setBusy(true);
      append({ type: "info", text: pkg ? `Installing ${pkg}…` : "Installing dependencies…" });
      await new Promise((r) => setTimeout(r, 1200));
      append(
        { type: "out",  text: pkg ? `added 1 package (${pkg})` : `found ${Math.floor(Math.random() * 50) + 10} packages` },
        { type: "ok",   text: "✓ done" },
        { type: "warn", text: "Note: packages are simulated — add them to package.json manually." },
      );
      setBusy(false);
      return;
    }

    if (cmd.startsWith("npm uninstall") || cmd.startsWith("npm remove") || cmd.startsWith("npm rm ")) {
      const pkg = cmd.split(" ").slice(2).join(" ").trim();
      append({ type: "ok", text: `removed ${pkg}` });
      return;
    }

    if (cmd === "npm run dev" || cmd === "npm start" || cmd === "npm run start") {
      setBusy(true);
      append({ type: "info", text: "Starting dev server…" });
      await new Promise((r) => setTimeout(r, 800));
      append({ type: "ok",  text: "  ➜  Local:   http://localhost:5173/" },
               { type: "out", text: "  ➜  Network: http://192.168.1.x:5173/" },
               { type: "info", text: "(simulated — actual server not started in browser terminal)" });
      setBusy(false);
      return;
    }

    if (cmd === "npm run build" || cmd === "npm build") {
      setBusy(true);
      append({ type: "info", text: "Building…" });
      await new Promise((r) => setTimeout(r, 1500));
      append(
        { type: "out", text: `dist/index.html         1.20 kB` },
        { type: "out", text: `dist/assets/index.js  142.30 kB` },
        { type: "ok",  text: "✓ Built in 1.52s" },
      );
      setBusy(false);
      return;
    }

    if (cmd === "npm test" || cmd === "npm run test") {
      setBusy(true);
      append({ type: "info", text: "Running tests…" });
      await new Promise((r) => setTimeout(r, 1000));
      append(
        { type: "ok",  text: "✓ 12 tests passed" },
        { type: "out", text: "  Duration: 0.8s" },
      );
      setBusy(false);
      return;
    }

    if (cmd.startsWith("npm run ")) {
      const script = cmd.slice(8).trim();
      setBusy(true);
      append({ type: "info", text: `Running script '${script}'…` });
      await new Promise((r) => setTimeout(r, 600));
      append({ type: "ok", text: `Script '${script}' completed` });
      setBusy(false);
      return;
    }

    if (cmd === "npm list" || cmd === "npm ls") {
      const pkg = JSON.parse(modifiedFiles["package.json"] ?? "{}");
      const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      if (!Object.keys(deps).length) { append({ type: "out", text: "(no package.json found — select a project)" }); }
      else {
        for (const [name, ver] of Object.entries(deps)) append({ type: "out", text: `  ${name}@${ver}` });
      }
      return;
    }

    if (cmd === "npm outdated") {
      append({ type: "out", text: "Package  Current  Wanted  Latest" },
               { type: "out", text: "(run inside a real project to see real results)" });
      return;
    }

    if (cmd === "npm audit") {
      append({ type: "ok",  text: "found 0 vulnerabilities" },
               { type: "info", text: "Audit simulated — use a real terminal for accurate results." });
      return;
    }

    if (cmd.startsWith("npx ")) {
      const rest = cmd.slice(4).trim();
      setBusy(true);
      append({ type: "info", text: `Running: npx ${rest}` });
      await new Promise((r) => setTimeout(r, 800));
      append({ type: "ok", text: `✓ npx ${rest} completed` });
      setBusy(false);
      return;
    }

    // ──────────────────────────────────────────── GIT ─────────────────────────

    if (cmd === "git --version") { append({ type: "out", text: "git version 2.44.0 (DevReview GitHub-API bridge)" }); return; }

    if (!sandboxId && cmd.startsWith("git ")) {
      append({ type: "err", text: "fatal: not a git repository — select a project first" }); return;
    }

    if (cmd === "git status" || cmd === "git status -s" || cmd === "git status -sb") {
      append({ type: "out", text: "On branch main" });
      append({ type: "out", text: "Your branch is up to date with 'origin/main'." });
      if (dirtyPaths.size === 0) {
        append({ type: "out", text: "nothing to commit, working tree clean" });
      } else {
        const short = cmd.includes("-s") || cmd.includes("-sb");
        if (!short) append({ type: "out", text: "\nChanges not staged for commit:" });
        for (const p of dirtyPaths) append({ type: short ? "err" : "err", text: short ? `  M ${p}` : `\tmodified:   ${p}` });
        append({ type: "info", text: `${dirtyPaths.size} file(s) modified` });
      }
      return;
    }

    if (cmd.startsWith("git add")) {
      append(dirtyPaths.size > 0
        ? { type: "ok",  text: `Staged ${dirtyPaths.size} file(s)` }
        : { type: "out", text: "nothing to add" });
      return;
    }

    if (cmd.startsWith("git commit")) {
      if (dirtyPaths.size === 0) { append({ type: "out", text: "nothing to commit, working tree clean" }); return; }
      const msg = parseCommitMsg(cmd);
      if (!msg) { append({ type: "err", text: 'error: commit message required\nusage: git commit -m "your message"' }); return; }
      sessionStorage.setItem(`commit_msg_${sandboxId}`, msg);
      const hash = Math.random().toString(36).slice(2, 9);
      append(
        { type: "ok",  text: `[main ${hash}] ${msg}` },
        { type: "out", text: ` ${dirtyPaths.size} file(s) changed` },
        { type: "info", text: "Run 'git push' to push to GitHub." },
      );
      return;
    }

    if (cmd.startsWith("git push")) {
      if (!workspaceId) { append({ type: "err", text: "fatal: not authenticated" }); return; }
      if (dirtyPaths.size === 0) { append({ type: "out", text: "Everything up-to-date" }); return; }

      const msg = sessionStorage.getItem(`commit_msg_${sandboxId}`) ?? "chore: update files from DevReview editor";
      const files = Array.from(dirtyPaths)
        .map((p) => ({ path: p, content: modifiedFiles[p] ?? "" }))
        .filter((f) => f.content.length > 0);

      if (!files.length) { append({ type: "err", text: "error: no file contents — open files in editor first" }); return; }

      setBusy(true);
      append({ type: "info", text: `Pushing ${files.length} file(s) to origin/main…` });
      try {
        const result = await fetchApi(`/projects/${sandboxId}/push`, {
          method: "POST", body: JSON.stringify({ message: msg, files }),
        }, workspaceId);
        const pushed = (result.results ?? []).filter((r: any) => r.status === "pushed");
        const failed = (result.results ?? []).filter((r: any) => r.status !== "pushed");
        append({ type: "ok",  text: `To ${result.repo ?? "origin"}` },
                 { type: "out", text: "   main -> main" });
        if (pushed.length) append({ type: "ok",  text: `${pushed.length} file(s) pushed ✓` });
        if (failed.length) append({ type: "err", text: `${failed.length} failed: ${failed.map((f: any) => f.path).join(", ")}` });
        sessionStorage.removeItem(`commit_msg_${sandboxId}`);
      } catch (e: any) {
        append({ type: "err", text: `error: ${e.message}` });
      } finally {
        setBusy(false);
      }
      return;
    }

    if (cmd.startsWith("git pull")) {
      setBusy(true);
      append({ type: "info", text: "Fetching from origin…" });
      await new Promise((r) => setTimeout(r, 800));
      append({ type: "ok",   text: "Already up to date." },
               { type: "info", text: "Files are fetched via GitHub API when you select a project." });
      setBusy(false);
      return;
    }

    if (cmd.startsWith("git fetch")) {
      append({ type: "ok",  text: "Fetched from origin" },
               { type: "info", text: "Reload the project to pull latest files from GitHub." });
      return;
    }

    if (cmd === "git log" || cmd.startsWith("git log ")) {
      const oneline = cmd.includes("--oneline");
      const hash = Math.random().toString(36).slice(2, 9);
      const msg = sessionStorage.getItem(`commit_msg_${sandboxId}`) ?? "chore: initial project structure (v0) 🚀";
      if (oneline) {
        append({ type: "out", text: `${hash} (HEAD -> main, origin/main) ${msg}` });
      } else {
        append(
          { type: "warn", text: `commit ${hash} (HEAD -> main, origin/main)` },
          { type: "out",  text: `Author: DevReview AI <ai@devreview.io>` },
          { type: "out",  text: `Date:   ${new Date().toDateString()}` },
          { type: "out",  text: "" },
          { type: "out",  text: `    ${msg}` },
        );
      }
      return;
    }

    if (cmd.startsWith("git diff")) {
      if (dirtyPaths.size === 0) { append({ type: "out", text: "(no changes)" }); return; }
      const target = cmd.split(" ").slice(2).join(" ").trim();
      const paths = target ? [target] : Array.from(dirtyPaths);
      for (const p of paths) {
        append({ type: "out",  text: `diff --git a/${p} b/${p}` },
                 { type: "out",  text: `index 0000000..1111111 100644` },
                 { type: "err",  text: `--- a/${p}` },
                 { type: "ok",   text: `+++ b/${p}` },
                 { type: "info", text: `@@ (editor changes not diffed in browser — ${modifiedFiles[p]?.split("\n").length ?? 0} lines)` });
      }
      return;
    }

    if (cmd.startsWith("git branch")) {
      if (cmd.includes("-a") || cmd.includes("--all")) {
        append({ type: "ok",  text: "* main" },
                 { type: "out", text: "  remotes/origin/main" });
      } else if (cmd.includes("-d") || cmd.includes("-D")) {
        const branch = cmd.split(" ").pop();
        append({ type: "ok", text: `Deleted branch ${branch}` });
      } else if (cmd.split(" ").length > 2) {
        const branch = cmd.split(" ")[2];
        append({ type: "ok",  text: `Branch '${branch}' created` },
                 { type: "info", text: "Branch switching targets the same GitHub branch via API." });
      } else {
        append({ type: "ok", text: "* main" });
      }
      return;
    }

    if (cmd.startsWith("git checkout") || cmd.startsWith("git switch")) {
      const parts = cmd.split(" ");
      const isNew = parts.includes("-b") || parts.includes("-c");
      const branch = parts[parts.length - 1];
      if (isNew) {
        append({ type: "ok",  text: `Switched to a new branch '${branch}'` });
      } else if (branch === "main" || branch === "master") {
        append({ type: "ok",  text: `Switched to branch '${branch}'` });
      } else {
        append({ type: "info", text: `Branch switching is simulated — edits target default branch via GitHub API.` });
      }
      return;
    }

    if (cmd === "git remote" || cmd === "git remote -v") {
      const url = modifiedFiles["__repoUrl__"] ?? `https://github.com/your-org/${sandboxId?.slice(0, 8) ?? "repo"}`;
      append({ type: "out", text: `origin\t${url} (fetch)` },
               { type: "out", text: `origin\t${url} (push)` });
      return;
    }

    if (cmd.startsWith("git remote add") || cmd.startsWith("git remote set-url")) {
      append({ type: "info", text: "Remote is managed via the project's repo_url in project settings." });
      return;
    }

    if (cmd.startsWith("git stash")) {
      if (cmd === "git stash" || cmd === "git stash push") {
        if (dirtyPaths.size === 0) { append({ type: "out", text: "No local changes to save" }); }
        else { append({ type: "ok", text: `Saved working directory and index state WIP on main: stash@{0}` }); }
      } else if (cmd === "git stash pop" || cmd === "git stash apply") {
        append({ type: "ok",   text: "Changes restored from stash" },
                 { type: "info", text: "Stash is simulated — use editor tabs to manage multiple versions." });
      } else if (cmd === "git stash list") {
        append({ type: "out", text: "stash@{0}: WIP on main" });
      } else {
        append({ type: "ok", text: "Stash operation completed" });
      }
      return;
    }

    if (cmd.startsWith("git reset")) {
      if (cmd.includes("--soft") || cmd.includes("--mixed")) {
        append({ type: "ok",   text: "HEAD reset. Changes preserved in working directory." });
      } else if (cmd.includes("--hard")) {
        append({ type: "warn", text: "HEAD reset. Warning: working directory changes would be lost in a real repo." });
      } else {
        append({ type: "ok",   text: `Unstaged changes after reset` });
      }
      return;
    }

    if (cmd.startsWith("git tag")) {
      const tag = cmd.split(" ").slice(2).join(" ").trim();
      if (!tag) { append({ type: "out", text: "v1.0.0" }); }
      else { append({ type: "ok", text: `Tag '${tag}' created` }); }
      return;
    }

    if (cmd.startsWith("git rebase")) {
      append({ type: "info", text: "Rebase is not supported in browser terminal." }); return;
    }

    if (cmd.startsWith("git merge")) {
      const branch = cmd.split(" ").pop();
      append({ type: "ok",   text: `Merge branch '${branch}' — fast-forward` },
               { type: "info", text: "Merges are simulated. Push to apply." });
      return;
    }

    if (cmd.startsWith("git clone")) {
      append({ type: "info", text: "Cloning via the GitHub API — use 'Projects' to add a repository." }); return;
    }

    if (cmd.startsWith("git ")) {
      const sub = cmd.split(" ")[1];
      append({ type: "err", text: `git: '${sub}' is not supported in browser terminal. See 'help'.` });
      return;
    }

    // ── unknown ───────────────────────────────────────────────────────────────
    append({ type: "err", text: `${cmd.split(" ")[0]}: command not found. Type 'help' to see available commands.` });
  }, [append, cwd, dirtyPaths, modifiedFiles, sandboxId, workspaceId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !input.trim()) return;
    runCmd(input);
    setInput("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(idx); if (idx >= 0) setInput(history[idx] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx); setInput(idx < 0 ? "" : (history[idx] ?? ""));
    } else if (e.ctrlKey && e.key === "l") {
      e.preventDefault(); setLines([]);
    } else if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      if (input) { append({ type: "cmd", text: `${cwd} $ ${input}^C` }); setInput(""); }
      setBusy(false);
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Basic tab completion for file paths
      const word = input.split(" ").pop() ?? "";
      const matches = Object.keys(modifiedFiles).filter((f) => f.startsWith(word) && !f.startsWith("__"));
      if (matches.length === 1) {
        setInput(input.slice(0, input.length - word.length) + matches[0]);
      } else if (matches.length > 1) {
        append({ type: "out", text: matches.join("  ") });
      }
    }
  };

  const color = (t: Line["type"]) => ({
    cmd:  "text-emerald-400",
    out:  "text-foreground/80",
    err:  "text-rose-400",
    ok:   "text-emerald-300",
    info: "text-sky-400",
    warn: "text-amber-400",
  }[t]);

  return (
    <div className="flex h-full flex-col bg-[#06080f] font-mono text-[12px] leading-relaxed"
      onClick={() => inputRef.current?.focus()}>
      <div className="min-h-0 flex-1 overflow-auto p-3 pb-1">
        {lines.map((l, i) => (
          <div key={i} className={color(l.type)}>
            {l.type === "cmd" ? l.text : `  ${l.text}`}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="flex shrink-0 items-center gap-2 border-t border-border/40 px-3 py-2">
        <span className="shrink-0 select-none text-emerald-400">{cwd} $</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={busy}
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-foreground caret-emerald-400 outline-none disabled:opacity-60"
        />
        {busy && <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400" />}
      </form>
    </div>
  );
}
