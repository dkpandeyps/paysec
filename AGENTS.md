# paysec — AI Engineering Workflow

paysec is a collection of SKILL.md files that give AI agents structured roles for
software development. Each skill is a specialist: CEO reviewer, eng manager,
designer, QA lead, release engineer, debugger, and more.

## Available skills

Skills live in `.agents/skills/` (or `~/.claude/skills/paysec/` on Claude Code).
Invoke them by name (e.g., `/idea-review`).

### Plan-mode reviews

| Skill | What it does |
|-------|-------------|
| `/idea-review` | Start here. Reframes your product idea before you write code. |
| `/plan-business-review` | CEO-level review: find the 10-star product in the request. |
| `/plan-tech-review` | Lock architecture, data flow, edge cases, and tests. |
| `/plan-ux-review` | Rate each design dimension 0-10, explain what a 10 looks like. |
| `/plan-dx-review` | DX-mode review: TTHW, magical moments, friction points, persona traces. |
| `/tune-questions` | Self-tune AskUserQuestion sensitivity per question. |
| `/auto-plan-review` | One command runs CEO → design → eng → DX review. |
| `/design-system` | Build a complete design system from scratch. |
| `/write-spec` | Turn vague intent into a precise, executable spec in five phases. Files a GitHub issue, optionally spawns a Claude Code agent in a fresh worktree, and lets `/ship-pr` close the source issue on merge. |

### Implementation + review

| Skill | What it does |
|-------|-------------|
| `/pr-review` | Pre-landing PR review. Finds bugs that pass CI but break in prod. |
| `/codex-second-opinion` | Second opinion via OpenAI Codex. Review, challenge, or consult modes. |
| `/debug-root-cause` | Systematic root-cause debugging. No fixes without investigation. |
| `/design-qa` | Live-site visual audit + fix loop with atomic commits. |
| `/design-variants` | Generate multiple AI design variants, comparison board, iterate. |
| `/design-to-html` | Generate production-quality Pretext-native HTML/CSS. |
| `/dx-audit` | Live developer experience audit (TTHW measured against the real flow). |
| `/qa-fix` | Open a real browser, find bugs, fix them, re-verify. |
| `/qa-report` | Same methodology as /qa-fix but report only — no code changes. |
| `/web-scrape` | Pull data from a web page. First call prototypes; codified call runs in ~200ms. |
| `/save-scrape-skill` | Codify the most recent successful `/web-scrape` flow into a permanent browser-skill. |

### Release + deploy

| Skill | What it does |
|-------|-------------|
| `/ship-pr` | Run tests, review, push, open PR. Workspace-aware version queue. |
| `/merge-and-deploy` | Merge the PR, wait for CI and deploy, verify production health. |
| `/post-deploy-monitor` | Post-deploy monitoring loop using the browse daemon. |
| `/merge-queue-report` | Read-only dashboard for the workspace-aware ship queue. |
| `/docs-release-update` | Update all docs to match what you just shipped. |
| `/docs-generate` | Generate Diataxis docs (tutorial / how-to / reference / explanation) from code. |
| `/deploy-setup` | One-time deploy config detection (Fly.io, Render, Vercel, etc.). |
| `/paysec-upgrade` | Update paysec to the latest version. |

### Operational + memory

| Skill | What it does |
|-------|-------------|
| `/save-context` | Save working context (git state, decisions, remaining work). |
| `/restore-context` | Resume from a saved context, even across Conductor workspaces. |
| `/learnings` | Manage what paysec learned across sessions. |
| `/weekly-retro` | Weekly retro with per-person breakdowns and shipping streaks. |
| `/code-health` | Code quality dashboard (type checker, linter, tests, dead code). |
| `/perf-check` | Performance regression detection (page load, Core Web Vitals). |
| `/model-benchmark` | Cross-model benchmark for skills (Claude, GPT, Gemini side-by-side). |
| `/security-audit` | OWASP Top 10 + STRIDE security audit. |
| `/brain-setup` | Set up gbrain for cross-machine session memory sync. |
| `/brain-sync` | Keep gbrain current with this repo's code; refresh agent search guidance in CLAUDE.md. |

### Browser + agent integration

| Skill | What it does |
|-------|-------------|
| `/browser` | Headless browser — real Chromium, real clicks, ~100ms/command. |
| `/open-paysec-browser` | Launch the visible PaySec Browser with sidebar + stealth. |
| `/import-browser-cookies` | Import cookies from your real browser for authenticated testing. |
| `/pair-remote-agent` | Pair a remote AI agent (OpenClaw, Codex, etc.) with your browser. |

### iOS QA — drive real iPhones over USB or Tailscale (v1.43.0.0+)

| Skill | What it does |
|-------|-------------|
| `/ios-device-qa` | Live-device iOS QA via USB CoreDevice tunnel + embedded StateServer. Optionally exposes the device over Tailscale so remote agents can drive it. |
| `/ios-auto-fix` | Autonomous iOS bug fixer with regression snapshot capture. |
| `/ios-design-audit` | Designer's-eye QA on a real iPhone — 10-dimension Apple HIG rubric. |
| `/ios-remove-debug` | Convenience: strip DebugBridge + #if DEBUG wiring before a Release build. |
| `/ios-bridge-sync` | Regenerate the iOS debug bridge against the latest upstream templates. |

Companion CLIs (run on the Mac that's plugged into the device):

| Command | What it does |
|---------|-------------|
| `paysec-ios-qa-daemon` | Mac-side broker. Loopback by default; `--tailnet` adds a Tailscale-facing listener with capability tiers and audit logging. |
| `paysec-ios-qa-mint` | Owner-grant CLI for the tailnet allowlist (`grant`/`revoke`/`list`). |
| `paysec-ios-qa-regen` | Regenerate the canonical local DebugBridge package and typed accessors (`--app-source` / `--bridge-dir`). |

End-to-end walkthrough: [docs/howto-ios-testing-with-paysec.md](docs/howto-ios-testing-with-paysec.md).

### Safety + scoping

| Skill | What it does |
|-------|-------------|
| `/safe-mode` | Warn before destructive commands (rm -rf, DROP TABLE, force-push). |
| `/lock-edits` | Lock edits to one directory. Hard block, not just a warning. |
| `/full-guard` | Activate both careful + freeze at once. |
| `/unlock-edits` | Remove directory edit restrictions. |
| `/md-to-pdf` | Turn any markdown file into a publication-quality PDF. |
| `/make-diagram` | English in, diagram out: mermaid source + editable .excalidraw + SVG/PNG, offline. |

## Build commands

```bash
bun install              # install dependencies
bun run test             # run free tests via the strict shard runner (no API spend, ~90-100s)
bun run test:windows     # curated Windows-safe subset (runs on windows-latest)
bun run build            # generate docs + compile binaries
bun run gen:skill-docs   # regenerate SKILL.md files from templates
bun run skill:check      # health dashboard for all skills
```

## Platform support

- **macOS** + **Linux**: full test suite supported.
- **Windows**: curated Windows-safe subset runs on `windows-latest` via the
  `windows-free-tests` CI job. Setup script (`./setup`) requires Git Bash or
  MSYS today; native PowerShell support is a future expansion. The `bin/paysec-paths`
  helper resolves state roots through `CLAUDE_PLUGIN_DATA` / `PAYSEC_HOME` so plugin
  installs work on every platform.

## Key conventions

- SKILL.md files are **generated** from `.tmpl` templates. Edit the template, not the output.
- Run `bun run gen:skill-docs --host codex` to regenerate Codex-specific output.
- The browse binary provides headless browser access. Use `$B <command>` in skills.
- Safety skills (careful, freeze, guard) use inline advisory prose — always confirm before destructive operations.
- State paths resolve via `bin/paysec-paths` (sourced via `eval "$(...)"`). Honors `PAYSEC_HOME`, `CLAUDE_PLUGIN_DATA`, `CLAUDE_PLANS_DIR`.
- The `claude` CLI binary resolves via `browser/src/claude-bin.ts` (`Bun.which()` + `PAYSEC_CLAUDE_BIN` override). Set `PAYSEC_CLAUDE_BIN=wsl` plus `PAYSEC_CLAUDE_BIN_ARGS='["claude"]'` to run Claude through WSL on Windows.
