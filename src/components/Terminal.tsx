import { useCallback, useEffect, useRef, useState } from "react";
import { fetchApi } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";

type Line =
  | { type: "cmd";  text: string }
  | { type: "out";  text: string }
  | { type: "err";  text: string }
  | { type: "ok";   text: string }
  | { type: "info"; text: string };

function parseCommitMsg(cmd: string): string | null {
  const m = cmd.match(/git\s+commit\s+(?:-m\s+)?["']([^"']+)["']/) ??
            cmd.match(/git\s+commit\s+-m\s+(\S+)/);
  return m ? m[1] : null;
}

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
  const [lines, setLines]     = useState<Line[]>([
    { type: "info", text: "DevReview Terminal — git push runs via GitHub API" },
    { type: "info", text: 'Type "help" to see available commands.' },
    { type: "out",  text: "" },
  ]);
  const [input, setInput]     = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [busy, setBusy]       = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const cwd = sandboxId ? `~/projects/${sandboxId.slice(0, 8)}` : "~/workspace";

  const append = useCallback((...nl: Line[]) => setLines((l) => [...l, ...nl]), []);

  const runCmd = useCallback(async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    setHistory((h) => [cmd, ...h].slice(0, 100));
    setHistIdx(-1);
    append({ type: "cmd", text: `${cwd} $ ${cmd}` });

    // help
    if (cmd === "help") {
      append(
        { type: "out",  text: "Available commands:" },
        { type: "out",  text: "  git status          show changed files" },
        { type: "out",  text: "  git add .           stage all changes" },
        { type: "out",  text: '  git commit -m "msg" commit staged changes' },
        { type: "out",  text: "  git push            push commits to GitHub" },
        { type: "out",  text: "  git log             show recent commits" },
        { type: "out",  text: "  git diff            show pending changes" },
        { type: "out",  text: "  ls                  list workspace files" },
        { type: "out",  text: "  clear               clear terminal" },
        { type: "info", text: "git push calls the GitHub Contents API directly — no local git needed." },
      );
      return;
    }

    // clear
    if (cmd === "clear" || cmd === "cls") { setLines([]); return; }

    // ls
    if (cmd === "ls" || cmd === "ls -la" || cmd === "dir") {
      const files = Object.keys(modifiedFiles);
      if (!files.length) {
        append({ type: "out", text: "(no files — select a project first)" });
      } else {
        for (const f of files) append({ type: "out", text: `  ${f}` });
      }
      return;
    }

    // pwd / whoami / date / echo
    if (cmd === "pwd")  { append({ type: "out", text: cwd }); return; }
    if (cmd === "whoami") { append({ type: "out", text: "devreview-user" }); return; }
    if (cmd === "date") { append({ type: "out", text: new Date().toString() }); return; }
    if (cmd.startsWith("echo ")) { append({ type: "out", text: cmd.slice(5) }); return; }

    // git status
    if (cmd === "git status" || cmd === "git status -s") {
      if (!sandboxId) { append({ type: "err", text: "fatal: not a git repository — select a project first" }); return; }
      append({ type: "out", text: "On branch main" });
      append({ type: "out", text: "Your branch is up to date with 'origin/main'." });
      if (dirtyPaths.size === 0) {
        append({ type: "out", text: "nothing to commit, working tree clean" });
      } else {
        append({ type: "out", text: "Changes not staged for commit:" });
        for (const p of dirtyPaths) append({ type: "err", text: `        modified:   ${p}` });
        append({ type: "info", text: `${dirtyPaths.size} file(s) modified — run 'git add .' then 'git commit -m "msg"'` });
      }
      return;
    }

    // git add
    if (cmd.startsWith("git add")) {
      if (!sandboxId) { append({ type: "err", text: "fatal: not a git repository" }); return; }
      append(dirtyPaths.size > 0
        ? { type: "ok",  text: `Staged ${dirtyPaths.size} file(s)` }
        : { type: "out", text: "nothing to add" });
      return;
    }

    // git commit
    if (cmd.startsWith("git commit")) {
      if (!sandboxId) { append({ type: "err", text: "fatal: not a git repository" }); return; }
      if (dirtyPaths.size === 0) { append({ type: "out", text: "nothing to commit, working tree clean" }); return; }
      const msg = parseCommitMsg(cmd);
      if (!msg) {
        append({ type: "err", text: 'error: commit message required — git commit -m "your message"' });
        return;
      }
      sessionStorage.setItem(`commit_msg_${sandboxId}`, msg);
      append(
        { type: "ok",  text: `[main ${Math.random().toString(36).slice(2, 9)}] ${msg}` },
        { type: "out", text: ` ${dirtyPaths.size} file(s) changed` },
        { type: "info", text: "Run 'git push' to push to GitHub." },
      );
      return;
    }

    // git push
    if (cmd.startsWith("git push")) {
      if (!sandboxId || !workspaceId) { append({ type: "err", text: "fatal: not a git repository — select a project first" }); return; }
      if (dirtyPaths.size === 0) { append({ type: "out", text: "Everything up-to-date" }); return; }

      const commitMsg = sessionStorage.getItem(`commit_msg_${sandboxId}`) || "chore: update files from DevReview editor";
      const files = Array.from(dirtyPaths)
        .map((path) => ({ path, content: modifiedFiles[path] ?? "" }))
        .filter((f) => f.content.length > 0);

      if (!files.length) { append({ type: "err", text: "error: no file contents to push — open files in editor first" }); return; }

      setBusy(true);
      append({ type: "info", text: `Pushing ${files.length} file(s) to origin/main…` });

      try {
        const result = await fetchApi(`/projects/${sandboxId}/push`, {
          method: "POST",
          body: JSON.stringify({ message: commitMsg, files }),
        }, workspaceId);

        const pushed = (result.results ?? []).filter((r: any) => r.status === "pushed");
        const failed = (result.results ?? []).filter((r: any) => r.status !== "pushed");

        append(
          { type: "ok",  text: `To github.com/${result.repo ?? "origin"}` },
          { type: "out", text: "   main -> main" },
        );
        if (pushed.length) append({ type: "ok",  text: `${pushed.length} file(s) pushed successfully ✓` });
        if (failed.length) append({ type: "err", text: `${failed.length} file(s) failed: ${failed.map((f: any) => f.path).join(", ")}` });
        sessionStorage.removeItem(`commit_msg_${sandboxId}`);
      } catch (err: any) {
        append({ type: "err", text: `error: ${err.message ?? "push failed"}` });
      } finally {
        setBusy(false);
      }
      return;
    }

    // git log
    if (cmd.startsWith("git log")) {
      append(
        { type: "out",  text: "\x1b[33mcommit a1b2c3d\x1b[0m (HEAD -> main, origin/main)" },
        { type: "out",  text: "Author: DevReview AI <ai@devreview.io>" },
        { type: "out",  text: `Date:   ${new Date().toDateString()}` },
        { type: "out",  text: "" },
        { type: "out",  text: "    chore: initial project structure (v0) 🚀" },
      );
      return;
    }

    // git diff
    if (cmd.startsWith("git diff")) {
      if (dirtyPaths.size === 0) { append({ type: "out", text: "(no changes)" }); return; }
      for (const p of dirtyPaths) {
        append({ type: "out",  text: `diff --git a/${p} b/${p}` });
        append({ type: "err",  text: `--- a/${p}` });
        append({ type: "ok",   text: `+++ b/${p}` });
        append({ type: "info", text: "(content diff not shown — changes exist in editor)" });
      }
      return;
    }

    // git branch
    if (cmd.startsWith("git branch")) { append({ type: "ok", text: "* main" }); return; }

    // git remote
    if (cmd === "git remote" || cmd === "git remote -v") {
      if (!sandboxId) { append({ type: "err", text: "fatal: not a git repository — select a project first" }); return; }
      const repoUrl = modifiedFiles["__repoUrl__"] ?? `https://github.com/your-org/${sandboxId.slice(0, 8)}`;
      append(
        { type: "out", text: `origin\t${repoUrl} (fetch)` },
        { type: "out", text: `origin\t${repoUrl} (push)` },
      );
      return;
    }

    // git remote add / set-url
    if (cmd.startsWith("git remote")) {
      append({ type: "info", text: "Remote is managed via the project's repo_url — edit it in Projects settings." });
      return;
    }

    // git fetch / git pull
    if (cmd.startsWith("git fetch") || cmd.startsWith("git pull")) {
      append({ type: "info", text: "Fetch/pull not supported in browser terminal — files are loaded via the GitHub API when you select a project." });
      return;
    }

    // git stash
    if (cmd.startsWith("git stash")) {
      append({ type: "info", text: "Stash is not supported — use the editor tabs to manage multiple file versions." });
      return;
    }

    // git checkout / git switch
    if (cmd.startsWith("git checkout") || cmd.startsWith("git switch")) {
      append({ type: "info", text: "Branch switching not supported — all edits target the default branch via the GitHub API." });
      return;
    }

    // git --version
    if (cmd === "git --version") { append({ type: "out", text: "git version 2.44.0 (DevReview API bridge)" }); return; }

    // any other git sub-command
    if (cmd.startsWith("git ")) {
      const sub = cmd.split(" ")[1];
      append({ type: "err", text: `git: '${sub}' is not a git command. See 'help'.` });
      return;
    }

    // unknown
    append({ type: "err", text: `${cmd.split(" ")[0]}: command not found. Type "help" for available commands.` });
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
      setHistIdx(idx);
      if (idx >= 0) setInput(history[idx] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setInput(idx < 0 ? "" : (history[idx] ?? ""));
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    } else if (e.key === "c" && e.ctrlKey) {
      e.preventDefault();
      if (input) { append({ type: "cmd", text: `${cwd} $ ${input}^C` }); setInput(""); }
    }
  };

  const color = (t: Line["type"]) =>
    t === "cmd"  ? "text-emerald-400" :
    t === "err"  ? "text-rose-400" :
    t === "ok"   ? "text-emerald-300" :
    t === "info" ? "text-sky-400" :
    "text-foreground/80";

  return (
    <div
      className="flex h-full flex-col bg-[#06080f] font-mono text-[12px] leading-relaxed"
      onClick={() => inputRef.current?.focus()}
    >
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
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none disabled:opacity-60"
        />
        {busy && <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400 shrink-0" />}
      </form>
    </div>
  );
}
