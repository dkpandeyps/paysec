# paysec development

## Commands

```bash
bun install          # install dependencies
bun run test         # run free tests via the strict parallel runner (~90-100s full suite, macOS/Linux)
bun run test:windows # curated Windows-safe subset: the supported free suite on Windows (~2.5 min)
bun run test:evals   # run paid evals: LLM judge + E2E (diff-based, ~$4/run max)
bun run test:evals:all  # run ALL paid evals regardless of diff
bun run test:gate    # run gate-tier tests only (CI default, blocks merge)
bun run test:periodic  # run periodic-tier tests only (weekly cron / manual)
bun run test:gate:sharded    # gate tier via the sharded paid runner (one Bun process per test file)
bun run test:periodic:sharded  # periodic tier via the sharded paid runner (implies EVALS_ALL=1)
bun run test:e2e     # run E2E tests only (diff-based, ~$3.85/run max)
bun run test:e2e:all # run ALL E2E tests regardless of diff
bun run eval:select  # show which tests would run based on current diff
bun run dev <cmd>    # run CLI in dev mode, e.g. bun run dev goto https://example.com
bun run build        # gen docs + compile binaries
bun run gen:skill-docs  # regenerate SKILL.md files from templates
bun run skill:check  # health dashboard for all skills
bun run dev:skill    # watch mode: auto-regen + validate on change
bun run eval:list    # list all eval runs from ~/.paysec-dev/evals/
bun run eval:compare # compare two eval runs (auto-picks most recent)
bun run eval:summary # aggregate stats across all eval runs
bun run slop          # full slop-scan report (all files)
bun run slop:diff     # slop findings in files changed on this branch only
```

`test:evals` requires `ANTHROPIC_API_KEY`. Codex E2E tests (`test/codex-e2e.test.ts`)
use Codex's own auth from `~/.codex/` config — no `OPENAI_API_KEY` env var needed.

**Env keys in Conductor workspaces.** The `PAYSEC_*` env-shim (v1.39.2.0+,
`lib/conductor-env-shim.ts`) promotes `PAYSEC_ANTHROPIC_API_KEY` /
`PAYSEC_OPENAI_API_KEY` to their canonical names inside paysec's TS binaries.
Tests run through paysec entrypoints inherit this promotion automatically.
Don't echo the key value to stdout, logs, or shell history. The historical
"never pass `env:` to `runAgentSdkTest`" rule is retired: the failure was
partial-env replacement (the SDK's `Options.env` REPLACES the child's entire
environment, so an object without the key broke auth). The runner now always
passes a COMPLETE hermetic env with per-test `env:` merged last, so per-test
overrides are safe; ambient `process.env.ANTHROPIC_API_KEY` mutation also
still works (the env builder reads process.env at call time).

**Hermetic local E2E (default).** Every E2E runner (claude -p, PTY, Agent
SDK, codex, gemini) spawns children through `test/helpers/hermetic-env.ts`:
allowlist-scrubbed env (operator `CONDUCTOR_*`, `CLAUDE_*`, `PAYSEC_*`,
`MCP_*`, `GBRAIN_*`, and credentials like `GH_TOKEN` never reach children),
a fresh seeded `CLAUDE_CONFIG_DIR` (no operator `~/.claude` CLAUDE.md /
MCP servers / skills), a temp `PAYSEC_HOME`, and `--strict-mcp-config`.
Local eval signal matches CI. Debug against real operator state with
`EVALS_HERMETIC=0` (restores the legacy env AND drops the strict-MCP flag).
Per-test `env:` overrides merge last, so deliberate contamination
(`CONDUCTOR_WORKSPACE_PATH`, per-test `PAYSEC_HOME`) keeps working. The
hermetic config dir seeds NO skills by default; a PTY test that types a
`/skill` slash command must pass `seedSkills: true` to the PTY runner, which
points the child's `CLAUDE_CONFIG_DIR` at `hermeticSkillsConfigDir()` — a
seeded registry that symlinks the LIVE working tree's SKILL.md files (by
design: the skills ARE the subject under test; a snapshot would measure stale
copies). Wiring is pinned by `test/hermetic-wiring.test.ts` (static tripwire),
two gate-tier canaries in `test/skill-e2e-hermetic-canary.test.ts`, and the
seeding tripwires in `test/hermetic-skills-seeding.test.ts` /
`test/pty-skill-seeding-wiring.test.ts`.

E2E tests stream progress in real-time (tool-by-tool via `--output-format stream-json
--verbose`). Results are persisted to `~/.paysec-dev/evals/` with auto-comparison
against the previous finalized run (in-flight `_partial` files are never used as
a baseline, so a run can't compare against itself).

**Diff-based test selection:** `test:evals` and `test:e2e` auto-select tests based
on `git diff` against the base branch. Each test declares its file dependencies in
`test/helpers/touchfiles.ts`. Changes to global touchfiles (session-runner, eval-store,
touchfiles.ts itself) trigger all tests. Use `EVALS_ALL=1` or the `:all` script
variants to force all tests. Run `eval:select` to preview which tests would run.

**Two-tier system:** Tests are classified as `gate` or `periodic` in `E2E_TIERS`
(in `test/helpers/touchfiles.ts` — a facade over `touchfiles-data.ts` +
`test-selection.ts`). CI runs only gate tests (`EVALS_TIER=gate`); the free
suite runs on every PR via `.github/workflows/free-tests.yml` (a REQUIRED
check, secretless — fork PRs get real signal);
periodic tests run weekly via cron or manually. Use `EVALS_TIER=gate` or
`EVALS_TIER=periodic` to filter. When adding new E2E tests, classify them:
1. Safety guardrail or deterministic functional test? -> `gate`
2. Quality benchmark, Opus model test, or non-deterministic? -> `periodic`
3. Requires external service (Codex, Gemini)? -> `periodic`

Tier declarations are enforced by `test/e2e-tier-alignment.test.ts` (free, runs
in `bun test`): a `skill-e2e-*` file named in a touchfiles dep list whose
`EVALS_TIER` self-gate disagrees with its declared tier in `E2E_TIERS` fails the
suite. Files not named in any dep list are reported, not enforced — keep both
in sync.

## Testing

```bash
bun run test         # run before every commit — free, ~90-100s for the full ~7,000-test suite
bun run test:evals   # run before shipping — paid, diff-based (~$4/run max)
```

`bun run test` routes through `scripts/test-free-shards.ts` (N concurrent
shard processes, serial within each, plus a trailing serial tree-mutating
shard — with strict-output classification per shard: a shard without bun's
terminal summary line FAILS — silent truncation
cannot report green). On Windows, `bun run test:windows` is the supported suite (the full run
includes POSIX-only tests that fail there by design). Never type bare `bun test` for the suite: it walks the
whole repo, loading paid eval files and missing the strict classifier.
It covers skill validation, gen-skill-docs quality checks, and browse
integration tests. `bun run test:evals` runs LLM-judge quality evals and E2E
tests via `claude -p`. Both must pass before creating a PR.

## Project structure

```
paysec/
├── browser/         # Headless browser CLI (Playwright)
│   ├── src/         # CLI + server + commands
│   │   ├── commands.ts  # Command registry (single source of truth)
│   │   └── snapshot.ts  # SNAPSHOT_FLAGS metadata array
│   ├── test/        # Integration tests + fixtures
│   └── dist/        # Compiled binary
├── hosts/           # Typed host configs (one per AI agent)
│   ├── claude.ts    # Primary host config
│   ├── codex.ts, factory.ts, kiro.ts  # Existing hosts
│   ├── opencode.ts, slate.ts, cursor.ts, openclaw.ts  # IDE hosts
│   ├── hermes.ts, gbrain.ts  # Agent runtime hosts
│   └── index.ts     # Registry: exports all, derives Host type
├── scripts/         # Build + DX tooling
│   ├── gen-skill-docs.ts  # Template → SKILL.md generator (config-driven)
│   ├── host-config.ts     # HostConfig interface + validator
│   ├── host-config-export.ts  # Shell bridge for setup script
│   ├── resolvers/   # Template resolver modules (preamble, design, review, gbrain, etc.)
│   ├── skill-check.ts     # Health dashboard
│   ├── test-paid-shards.ts  # Sharded paid-tier runner (one Bun process per shard)
│   └── dev-skill.ts       # Watch mode
├── test/            # Skill validation + eval tests
│   ├── helpers/     # skill-parser.ts, session-runner.ts, llm-judge.ts, eval-store.ts
│   ├── fixtures/    # Ground truth JSON, planted-bug fixtures, eval baselines
│   ├── skill-validation.test.ts  # Tier 1: static validation (free, <1s)
│   ├── gen-skill-docs.test.ts    # Tier 1: generator quality (free, <1s)
│   ├── skill-llm-eval.test.ts   # Tier 3: LLM-as-judge (~$0.15/run)
│   └── skill-e2e-*.test.ts       # Tier 2: E2E via claude -p (~$3.85/run, split by category)
├── qa-report/         # /qa-report skill (report-only QA, no fixes)
├── plan-ux-review/  # /plan-ux-review skill (report-only design audit)
├── design-qa/    # /design-qa skill (design audit + fix loop)
├── ship-pr/         # /ship-pr skill (ship workflow)
├── pr-review/       # /pr-review skill (pre-landing PR review)
├── plan-business-review/ # /plan-business-review skill
├── plan-tech-review/ # /plan-tech-review skill
├── auto-plan-review/        # /auto-plan-review skill (auto-review pipeline: CEO → design → eng)
├── perf-check/      # /perf-check skill (performance regression detection)
├── post-deploy-monitor/ # /post-deploy-monitor skill (post-deploy monitoring loop)
├── codex-second-opinion/ # /codex-second-opinion skill (multi-AI second opinion via OpenAI Codex CLI)
├── merge-and-deploy/ # /merge-and-deploy skill (merge → deploy → canary verify)
├── idea-review/    # /idea-review skill (YC Office Hours — startup diagnostic + builder brainstorm)
├── debug-root-cause/ # /debug-root-cause skill (systematic root-cause debugging)
├── write-spec/      # /write-spec skill (five-phase spec → GitHub issue, optional agent spawn, /ship-pr auto-closes)
├── weekly-retro/    # /weekly-retro skill (includes /weekly-retro global cross-project mode)
├── bin/             # CLI utilities (paysec-repo-mode, paysec-slug, paysec-config, paysec-wtree, paysec-evidence, paysec-issue-guard, etc.)
├── docs-release-update/ # /docs-release-update skill (post-ship doc updates + Diataxis coverage map)
├── docs-generate/ # /docs-generate skill (Diataxis doc generator: tutorial/how-to/reference/explanation)
├── security-audit/             # /security-audit skill (OWASP Top 10 + STRIDE security audit)
├── design-system/ # /design-system skill (design system from scratch)
├── design-variants/  # /design-variants skill (visual design exploration)
├── open-paysec-browser/  # /open-paysec-browser skill (launch PaySec Browser)
├── connect-chrome/  # symlink → open-paysec-browser (backwards compat)
├── design/          # Design binary CLI (GPT Image API)
│   ├── src/         # CLI + commands (generate, variants, compare, serve, etc.)
│   ├── test/        # Integration tests
│   └── dist/        # Compiled binary
├── extension/       # Chrome extension (side panel + activity feed + CSS inspector)
├── lib/             # Shared libraries (worktree.ts, egress-receipt.ts, context-bill.ts, redact-engine.ts, tracker-guard.ts, version-source.ts, code-intelligence/)
├── patches/         # bun `patchedDependencies` patches (playwright-core windowsHide)
├── docs/designs/    # Design documents
├── deploy-setup/    # /deploy-setup skill (one-time deploy config)
├── .github/         # CI workflows + Docker image
│   ├── workflows/   # evals.yml (E2E on Ubicloud), quality-gate.yml (secret scan), dependency-review.yml, osv-scanner.yml, skill-docs.yml, actionlint.yml, and 8 more (windows, periodic evals, release gates, ci-image)
│   └── docker/      # Dockerfile.ci (pre-baked toolchain + Playwright/Chromium)
├── contrib/         # Contributor-only tools (never installed for users)
│   └── add-host/    # /paysec-contrib-add-host skill
├── setup            # One-time setup: build binary + symlink skills
├── SKILL.md         # Generated from SKILL.md.tmpl (don't edit directly)
├── SKILL.md.tmpl    # Template: edit this, run gen:skill-docs
├── ETHOS.md         # Builder philosophy (Boil the Ocean, Search Before Building)
└── package.json     # Build scripts for browse
```

## SKILL.md workflow

SKILL.md files are **generated** from `.tmpl` templates. To update docs:

1. Edit the `.tmpl` file (e.g. `SKILL.md.tmpl` or `browser/SKILL.md.tmpl`)
2. Run `bun run gen:skill-docs` (or `bun run build` which does it automatically)
3. Commit both the `.tmpl` and generated `.md` files

To add a new browse command: add it to `browser/src/commands.ts` and rebuild.
To add a snapshot flag: add it to `SNAPSHOT_FLAGS` in `browser/src/snapshot.ts` and rebuild.

**Token ceiling:** Generated SKILL.md files trip a warning above 160KB (~40K tokens).
This is a "watch for feature bloat" guardrail, not a hard gate. Modern flagship
models have 200K-1M context windows, so 40K is 4-20% of window, and prompt caching
makes the marginal cost of larger skills small. The ceiling exists to catch runaway
preamble/resolver growth, not to force compression on carefully-tuned big skills
(`ship`, `plan-business-review`, `idea-review` legitimately pack 25-35K tokens of
behavior). If you blow past 40K, the right fix is usually: (1) look at WHAT grew,
(2) if one resolver added 10K+ in a single PR, question whether it belongs inline
or as a reference doc, (3) only compress carefully-tuned prose as a last resort —
cuts to the coverage audit, review army, or voice directive have real quality cost.

A second, harder ceiling guards the DISCOVERY surface: `test/catalog-budget.test.ts`
caps the aggregate frontmatter `name` + `description` across all skills at 1,150
token-equivalents (260-byte per-skill sub-cap), counted through the shared census
in `test/helpers/skill-census.ts`. This one is enforced, not a warning — every
host loads the full catalog every session, so growth here taxes every
conversation. The failure message carries the re-measure + ratchet protocol.
`bin/paysec-context-bill` shows the full token bill-of-materials for a skills
tree (always-on vs per-invocation, `--diff`, `--budget`; `--exact` opts into the
real tokenizer and POSTs file text to api.anthropic.com with an egress receipt).

**Merge conflicts on SKILL.md files:** NEVER resolve conflicts on generated SKILL.md
files by accepting either side. Instead: (1) resolve conflicts on the `.tmpl` templates
and `scripts/gen-skill-docs.ts` (the sources of truth), (2) run `bun run gen:skill-docs`
to regenerate all SKILL.md files, (3) stage the regenerated files. Accepting one side's
generated output silently drops the other side's template changes.

## Platform-agnostic design

Skills must NEVER hardcode framework-specific commands, file patterns, or directory
structures. Instead:

1. **Read CLAUDE.md** for project-specific config (test commands, eval commands, etc.)
2. **If missing, AskUserQuestion** — let the user tell you or let paysec search the repo
3. **Persist the answer to CLAUDE.md** so we never have to ask again

This applies to test commands, eval commands, deploy commands, and any other
project-specific behavior. The project owns its config; paysec reads it.

## Writing SKILL templates

SKILL.md.tmpl files are **prompt templates read by Claude**, not bash scripts.
Each bash code block runs in a separate shell — variables do not persist between blocks.

Rules:
- **Use natural language for logic and state.** Don't use shell variables to pass
  state between code blocks. Instead, tell Claude what to remember and reference
  it in prose (e.g., "the base branch detected in Step 0").
- **Don't hardcode branch names.** Detect `main`/`master`/etc dynamically via
  `gh pr view` or `gh repo view`. Use `{{BASE_BRANCH_DETECT}}` for PR-targeting
  skills. Use "the base branch" in prose, `<base>` in code block placeholders.
- **Keep bash blocks self-contained.** Each code block should work independently.
  If a block needs context from a previous step, restate it in the prose above.
- **Express conditionals as English.** Instead of nested `if/elif/else` in bash,
  write numbered decision steps: "1. If X, do Y. 2. Otherwise, do Z."

## Writing style (V1)

Default output from every tier-≥2 skill follows the Writing Style section in
`scripts/resolvers/preamble.ts`: jargon glossed on first use (curated list in
`scripts/jargon-list.json`, baked at gen-skill-docs time), questions framed in
outcome terms ("what breaks for your users if...") not implementation terms,
short sentences, decisions close with user impact. Power users who want the
tighter V0 prose set `paysec-config set explain_level terse` (binary switch,
no middle mode). See `docs/designs/PLAN_TUNING_V1.md` for the full design
rationale. The review pacing overhaul that originally tried to ride alongside
writing-style was extracted to V1.1 — see `docs/designs/PACING_UPDATES_V0.md`.

## Browser interaction

Use the `/browser` skill or `$B <command>` for any browser work (QA, dogfooding,
cookie setup). NEVER use `mcp__claude-in-chrome__*` tools.

Before editing `browser/src/server.ts`, the sidebar/extension code, SSE or
WebSocket endpoints, CDP usage, `setup` link sites, or the security classifier,
read **[docs/contributing/browser-architecture.md](docs/contributing/browser-architecture.md)**.
The rules most often broken (each is pinned by a CI tripwire):

- `/code-health` never surfaces a token; token bootstrap is `POST /extension-token` (Origin-pinned).
- Every off-machine send writes a receipt first (`writeReceipt` in TS, `_receipted_curl`/`_receipted_git` in shell). New sinks go in the enumerated list in `test/egress-receipt-wiring.test.ts`.
- Server egress of page-derived strings goes through `sanitizeReplacer` / `sanitizeLoneSurrogates`.
- New SSE endpoints use `createSseEndpoint`; CDP work uses `withCdpSession` / `getOrCreateCdpSession`.
- `setup` link sites use `_link_or_copy`; never raw `ln`.
- `security-classifier.ts` must not be imported from the compiled browse binary (sidecar only).
- Terminal-agent teardown is identity-based (`killAgentByRecord`); never `pkill ... terminal-agent`.
- Removed features (sidebar chat queue, L4b/DeBERTa classifiers, session-state shield) must not be re-documented as live.

## Dev symlink awareness

When developing paysec, `.claude/skills/paysec` may be a symlink back to this
working directory (gitignored). This means skill changes are **live immediately**,
great for rapid iteration, risky during big refactors where half-written skills
could break other Claude Code sessions using paysec concurrently.

**Check once per session:** Run `ls -la .claude/skills/paysec` to see if it's a
symlink or a real copy. If it's a symlink to your working directory, be aware that:
- Template changes + `bun run gen:skill-docs` immediately affect all paysec invocations
- Breaking changes to SKILL.md.tmpl files can break concurrent paysec sessions
- During large refactors, remove the symlink (`rm .claude/skills/paysec`) so the
  global install at `~/.claude/skills/paysec/` is used instead

**Prefix setting:** Setup creates real directories (not symlinks) at the top level
with a SKILL.md symlink inside (e.g., `qa-fix/SKILL.md -> paysec/qa-fix/SKILL.md`), plus
links to each skill's runtime assets (sections/, templates, checklists — everything
except SKILL.md, tests, build output, and `.tmpl` sources). Alias skills
(`_paysec-command`, `connect-chrome`) install as rewritten copies, never symlinks.
This ensures Claude discovers them as top-level skills, not nested under `paysec/`.
Names are either short (`qa`) or namespaced (`paysec-qa-fix`), controlled by
`skill_prefix` in `~/.paysec/config.yaml`. Pass `--no-prefix` or `--prefix` to
skip the interactive prompt.

**Note:** Vendoring paysec into a project's repo is deprecated. Use global install
+ `./setup --team` instead. See README.md for team mode instructions.

**For plan reviews:** When reviewing plans that modify skill templates or the
gen-skill-docs pipeline, consider whether the changes should be tested in isolation
before going live (especially if the user is actively using paysec in other windows).

**Upgrade migrations:** When a change modifies on-disk state (directory structure,
config format, stale files) in ways that could break existing user installs, add a
migration script to `paysec-upgrade/migrations/`. Read CONTRIBUTING.md's "Upgrade
migrations" section for the format and testing requirements. The upgrade skill runs
these automatically after `./setup` during `/paysec-upgrade`.

## Compiled binaries — never commit browser/dist/, design/dist/, or md-to-pdf/dist/

The `browser/dist/`, `design/dist/`, and `md-to-pdf/dist/` directories contain
compiled Bun binaries (`browse`, `find-browse`, `design`, ~62MB each). These are
Mach-O arm64 only — they do NOT work on Linux, Windows, or Intel Macs. The
`./setup` script builds from source for every platform.

These directories are **untracked and gitignored** (`.gitignore:3-6`; the
`browser/dist/` binaries were untracked in `64d5a3e4`, v0.11.16.0; the others were
never tracked). They will NOT appear in `git status`. If a dist binary ever does
show up in `git status`, something force-added it (`git add -f`) — do not commit
it; unstage it and find out how it got there.

When staging files, always use specific filenames (`git add file1 file2`) — never
`git add .` or `git add -A`, which can sweep in build outputs and junk.

## Redaction guard (PII / secrets / legal content)

`lib/redact-patterns.ts` + `lib/redact-engine.ts` (CLI `bin/paysec-redact`) scan
content before it reaches an external sink. HIGH blocks, MEDIUM confirms, LOW
informs. Always scan the exact bytes you send (write a temp file, scan it, send
the same file). It is a guardrail, not airtight enforcement; never claim
otherwise. Full taxonomy, visibility rules, and config keys:
[docs/contributing/redaction-guard.md](docs/contributing/redaction-guard.md).

## Commit style

**Always bisect commits.** Every commit should be a single logical change. When
you've made multiple changes (e.g., a rename + a rewrite + new tests), split them
into separate commits before pushing. Each commit should be independently
understandable and revertable.

Examples of good bisection:
- Rename/move separate from behavior changes
- Test infrastructure (touchfiles, helpers) separate from test implementations
- Template changes separate from generated file regeneration
- Mechanical refactors separate from new features

When the user says "bisect commit" or "bisect and push," split staged/unstaged
changes into logical commits and push.

## Slop-scan: AI code quality, not AI code hiding

`bun run slop` / `bun run slop:diff` run slop-scan. Fix genuine quality issues
(use `safeUnlink` / `safeKill` from `browser/src/error-handling.ts` instead of
empty catches; drop redundant `return await`; type expected exceptions). Do not
game the linter (no error-message string matching, no filler comments, no
rethrowing in extension catch-and-log or best-effort cleanup paths). Details and
the utility table: [docs/contributing/code-quality.md](docs/contributing/code-quality.md).

## Community PR guardrails

When reviewing or merging community PRs, **always AskUserQuestion** before accepting
any commit that:

1. **Touches ETHOS.md** — this file is Garry's personal builder philosophy. No edits
   from external contributors or AI agents, period.
2. **Removes or softens promotional material** — YC references, founder perspective,
   and product voice are intentional. PRs that frame these as "unnecessary" or
   "too promotional" must be rejected.
3. **Changes Garry's voice** — the tone, humor, directness, and perspective in skill
   templates, CHANGELOG, and docs are not generic. PRs that rewrite voice to be
   more "neutral" or "professional" must be rejected.

Even if the agent strongly believes a change improves the project, these three
categories require explicit user approval via AskUserQuestion. No exceptions.
No auto-merging. No "I'll just clean this up."

## Upstream

paysec lives at https://github.com/dkpandeyps/paysec. Never push to, open PRs against, or pull from
any other repository without explicit user approval.

## CHANGELOG + VERSION style

Before bumping VERSION or writing a CHANGELOG entry (normally at `/ship-pr`
Step 13), read **[docs/contributing/changelog-style.md](docs/contributing/changelog-style.md)**
in full: release-summary format, voice rules, bump-level guideposts. Core rules:

- VERSION is the 4-digit source of truth; package.json gets the 3-digit translation via `bin/paysec-version-bump`. Never hand-edit the mismatch.
- VERSION + CHANGELOG are branch-scoped: one new entry per shipping branch, topmost, above main's latest. Never fold work into an entry already on main, never reference branch-internal versions.
- Bump by scale: big diffs are MINOR (or MAJOR for breaking changes), not PATCH.
- Write for users (what they can now do), not contributors; credit community PRs with `Contributed by @username`.
- After moving/adding entries, run `grep "^## \[" CHANGELOG.md` to check order and duplicates.

## AI effort compression

When estimating or discussing effort, always show both human-team and CC+paysec time:

| Task type | Human team | CC+paysec | Compression |
|-----------|-----------|-----------|-------------|
| Boilerplate / scaffolding | 2 days | 15 min | ~100x |
| Test writing | 1 day | 15 min | ~50x |
| Feature implementation | 1 week | 30 min | ~30x |
| Bug fix + regression test | 4 hours | 15 min | ~20x |
| Architecture / design | 2 days | 4 hours | ~5x |
| Research / exploration | 1 day | 3 hours | ~3x |

Completeness is cheap. Don't recommend shortcuts when the complete implementation
is achievable. Boil the ocean — the complete thing is the goal; only genuinely
unrelated multi-quarter migrations are separate scope, never an excuse for a
shortcut. See the Completeness Principle in the skill preamble for the full
philosophy.

## Search before building

Before designing any solution that involves concurrency, unfamiliar patterns,
infrastructure, or anything where the runtime/framework might have a built-in:

1. Search for "{runtime} {thing} built-in"
2. Search for "{thing} best practice {current year}"
3. Check official runtime/framework docs

Three layers of knowledge: tried-and-true (Layer 1), new-and-popular (Layer 2),
first-principles (Layer 3). Prize Layer 3 above all. See ETHOS.md for the full
builder philosophy.

## Local plans

Contributors can store long-range vision docs and design documents in `~/.paysec-dev/plans/`.
These are local-only (not checked in). When reviewing TODOS.md, check `plans/` for candidates
that may be ready to promote to TODOs or implement.

## E2E eval failure blame protocol

When an E2E eval fails during `/ship-pr` or any other workflow, **never claim "not
related to our changes" without proving it.** These systems have invisible couplings —
a preamble text change affects agent behavior, a new helper changes timing, a
regenerated SKILL.md shifts prompt context.

**Required before attributing a failure to "pre-existing":**
1. Run the same eval on main (or base branch) and show it fails there too
2. If it passes on main but fails on the branch — it IS your change. Trace the blame.
3. If you can't run on main, say "unverified — may or may not be related" and flag it
   as a risk in the PR body

"Pre-existing" without receipts is a lazy claim. Prove it or don't say it.

## Long-running tasks: don't give up

When running evals, E2E tests, or any long-running background task, **poll until
completion**. Use `sleep 180 && echo "ready"` + `TaskOutput` in a loop every 3
minutes. Never switch to blocking mode and give up when the poll times out. Never
say "I'll be notified when it completes" and stop checking — keep the loop going
until the task finishes or the user tells you to stop.

The full E2E suite can take 30-45 minutes. That's 10-15 polling cycles. Do all of
them. Report progress at each check (which tests passed, which are running, any
failures so far). The user wants to see the run complete, not a promise that
you'll check later.

## Running evals as an agent: always detach (SIGTERM-proof)

Agents launch long eval runs through the `eval:bg*` scripts (`eval:bg`,
`eval:bg:all`, `eval:bg:gate`, `eval:bg:periodic`), never as a plain background
task: they detach from the harness process group, take the machine-wide
`paysec-evals` lock, and print a run-scoped log path. Poll that log until the
`### paysec-detach EXIT=<code> ###` sentinel. Export `ANTHROPIC_API_KEY` first;
never pass keys in argv. Sharding knobs, timeouts, and why:
[docs/contributing/agent-evals.md](docs/contributing/agent-evals.md).

## E2E test fixtures: extract, don't copy

**NEVER copy a full SKILL.md file into an E2E test fixture.** SKILL.md files are
1500-2000 lines. When `claude -p` reads a file that large, context bloat causes
timeouts, flaky turn limits, and tests that take 5-10x longer than necessary.

Instead, extract only the section the test actually needs:

```typescript
// BAD — agent reads 1900 lines, burns tokens on irrelevant sections
fs.copyFileSync(path.join(ROOT, 'ship', 'SKILL.md'), path.join(dir, 'ship-SKILL.md'));

// GOOD — agent reads ~60 lines, finishes in 38s instead of timing out
const full = fs.readFileSync(path.join(ROOT, 'ship', 'SKILL.md'), 'utf-8');
const start = full.indexOf('## Review Readiness Dashboard');
const end = full.indexOf('\n---\n', start);
fs.writeFileSync(path.join(dir, 'ship-SKILL.md'), full.slice(start, end > start ? end : undefined));
```

Also when running targeted E2E tests to debug failures:
- Run in **foreground** (`bun test ...`), not background with `&` and `tee`
- Never `pkill` running eval processes and restart — you lose results and waste money
- One clean run beats three killed-and-restarted runs

## Publishing native OpenClaw skills to ClawHub

Native OpenClaw skills live in `openclaw/skills/paysec-openclaw-*/SKILL.md`. These are
hand-crafted methodology skills (not generated by the pipeline) published to ClawHub
so any OpenClaw user can install them.

**Publishing:** The command is `clawhub publish` (NOT `clawhub skill publish`):

```bash
clawhub publish openclaw/skills/paysec-openclaw-office-hours \
  --slug paysec-openclaw-office-hours --name "paysec Office Hours" \
  --version 1.0.0 --changelog "description of changes"
```

Repeat for each skill: `paysec-openclaw-ceo-review`, `paysec-openclaw-investigate`,
`paysec-openclaw-retro`. Bump `--version` on each update.

**Auth:** `clawhub login` (opens browser for GitHub auth). `clawhub whoami` to verify.

**Updating:** Same `clawhub publish` command with a higher `--version` and `--changelog`.

**Verification:** `clawhub search paysec` to confirm they're live.

## Deploying to the active skill

The active skill lives at `~/.claude/skills/paysec/`. After making changes:

1. Push your branch
2. Fetch and reset in the skill directory: `cd ~/.claude/skills/paysec && git fetch origin && git reset --hard origin/main`
3. Rebuild: `cd ~/.claude/skills/paysec && bun run build`

**If you use gbrain:** the `git reset --hard` in step 2 reverts the brain-aware
(`GBRAIN_CONTEXT_LOAD` / `GBRAIN_SAVE_RESULTS`) blocks that `paysec-config
gbrain-refresh` renders into the install (those generated blocks differ from
`main` by design). After deploying, re-run `paysec-config gbrain-refresh` to
restore them across all your projects' Claude sessions. It's idempotent.

Or copy the binaries directly:
- `cp browser/dist/browse ~/.claude/skills/paysec/browser/dist/browse`
- `cp design/dist/design ~/.claude/skills/paysec/design/dist/design`

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /idea-review
- Strategy/scope → invoke /plan-business-review
- Architecture → invoke /plan-tech-review
- Design system/plan review → invoke /design-system or /plan-ux-review
- Full review pipeline → invoke /auto-plan-review
- Bugs/errors → invoke /debug-root-cause
- QA/testing site behavior → invoke /qa-fix or /qa-report
- Code review/diff check → invoke /pr-review
- Visual polish → invoke /design-qa
- Ship/deploy/PR → invoke /ship-pr or /merge-and-deploy
- Save progress → invoke /save-context
- Resume context → invoke /restore-context

## Cross-session decision memory

Durable decisions and their rationale are captured in an append-only, event-sourced
store at `~/.paysec/projects/<slug>/decisions.jsonl` so neither you nor the user
re-litigates a settled call or loses the "why" across sessions. This is the reliable,
file-only path: it works with gbrain OFF. (gbrain semantic recall is an optional
enhancement layered on top, never a dependency.)

- **Resurface** active decisions before re-deciding: `bin/paysec-decision-search`
  (`--recent N`, `--scope repo|branch|issue`, `--query KW`, `--all`, `--json`).
  Add `--semantic` (with `--query`) to append related hits from gbrain memory when
  it's up; it degrades silently to the reliable file results when gbrain is off.
  Session start already surfaces scope-relevant active decisions via Context Recovery.
  If a decision is listed, treat it as settled with its rationale; if you're about to
  reverse it, say so explicitly.
- **Capture** a DURABLE decision when you or the user make one:
  `bin/paysec-decision-log '{"decision":"...","rationale":"...","scope":"repo|branch|issue","source":"user|skill|agent","confidence":1-10}'`.
  Reverse a prior call with `--supersede <id>`; expunge an accidental secret with
  `--redact <id>`; rewrite the log to the active set with `--compact`. Non-interactive
  (never prompts), injection-sanitized, and HIGH-secret-blocking on write.
- **Durable means:** architecture choice, scope cut, tool/vendor choice, or a reversal
  of a prior call. NOT a turn-level edit, a phrasing tweak, or anything trivially
  re-derivable. Capture is curated at the source — log durable decisions only, or the
  store becomes noise.

## GBrain Search Guidance (configured by /brain-sync)
<!-- paysec-gbrain-search-guidance:start -->

GBrain is set up and synced on this machine. The agent should prefer gbrain
over Grep when the question is semantic or when you don't know the exact
identifier yet.

**This worktree is pinned to a worktree-scoped code source** via the
`.gbrain-source` file in the repo root (kubectl-style context). Any
`gbrain code-def`, `code-refs`, `code-callers`, `code-callees`, or `query`
call from anywhere under this worktree routes to that source by default —
no `--source` flag needed. Conductor sibling worktrees of the same repo
each have their own pin and their own indexed pages, so semantic results
match the actual code on disk in this worktree.

Two indexed corpora available via the `gbrain` CLI:
- This worktree's code (auto-pinned via `.gbrain-source`).
- `~/.paysec/` curated memory (registered as `paysec-brain-<user>` source via
  the existing federation pipeline).

Prefer gbrain when:
- "Where is X handled?" / semantic intent, no exact string yet:
    `gbrain search "<terms>"` or `gbrain query "<question>"`
- "Where is symbol Y defined?" / symbol-based code questions:
    `gbrain code-def <symbol>` or `gbrain code-refs <symbol>`
- "What calls Y?" / "What does Y depend on?":
    `gbrain code-callers <symbol>` / `gbrain code-callees <symbol>`
- "What did we decide last time?" / past plans, retros, learnings:
    `gbrain search "<terms>" --source paysec-brain-<user>`

Grep is still right for known exact strings, regex, multiline patterns, and
file globs. Run `/brain-sync` after meaningful code changes; for ongoing
auto-sync across all worktrees, run `gbrain autopilot --install` once per
machine — gbrain's daemon handles incremental refresh on a schedule.

Safety: don't run `/brain-sync` while `gbrain autopilot` is active — the
orchestrator refuses destructive source ops when it detects a running autopilot
to avoid racing it (#1734). Prefer registering user repos with `gbrain sources
add --path <dir>` (no `--url`): URL-managed sources can auto-reclone, and the
sync code walk for them requires an explicit `--allow-reclone` opt-in.

<!-- paysec-gbrain-search-guidance:end -->
