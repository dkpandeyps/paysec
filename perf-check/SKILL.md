---
name: perf-check
preamble-tier: 1
version: 1.0.0
description: Performance regression detection using the browse daemon. (paysec)
triggers:
  - performance benchmark
  - check page speed
  - detect performance regression
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->


## When to invoke this skill

Establishes
baselines for page load times, Core Web Vitals, and resource sizes.
Compares before/after on every PR. Tracks performance trends over time.
Use when: "performance", "benchmark", "page speed", "lighthouse", "web vitals",
"bundle size", "load time".

Voice triggers (speech-to-text aliases): "speed test", "check performance".

## Preamble (run first)

```bash
_PAYSEC_PREAMBLE="$HOME/.claude/skills/paysec/bin/paysec-preamble"; [ -x "$_PAYSEC_PREAMBLE" ] || _PAYSEC_PREAMBLE=".claude/skills/paysec/bin/paysec-preamble"
if [ -x "$_PAYSEC_PREAMBLE" ]; then "$_PAYSEC_PREAMBLE" --skill perf-check --overlay claude --ppid "$PPID"; else echo "PAYSEC_PREAMBLE: unavailable (paysec bin not found; re-run ./setup)"; fi
```

## Plan Mode Safe Operations

In plan mode, allowed because they inform the plan: `$B`, `$D`, `codex exec`/`codex review`, writes to `~/.paysec/`, writes to the plan file, and `open` for generated artifacts.

## Skill Invocation During Plan Mode

If the user invokes a skill in plan mode, the skill takes precedence over generic plan mode behavior. **Treat the skill file as executable instructions, not reference.** Follow it step by step starting from Step 0; any AskUserQuestion the skill fires is the workflow operating within plan mode, not a violation of it — and a skill whose instructions resolve a question themselves (e.g. a plan-mode auto-select) may legitimately not ask it. AskUserQuestion (any variant — `mcp__*__AskUserQuestion` or native; see "AskUserQuestion Format → Tool resolution") satisfies plan mode's end-of-turn requirement. If AskUserQuestion is unavailable or a call fails, follow the AskUserQuestion Format failure fallback: `headless` → BLOCKED; `interactive` → the prose fallback (also satisfies end-of-turn). At a STOP point, stop immediately. Do not continue the workflow or call ExitPlanMode there. Commands marked "PLAN MODE EXCEPTION — ALWAYS RUN" execute. Call ExitPlanMode only after the skill workflow completes, or if the user tells you to cancel the skill or leave plan mode.

If `PROACTIVE` is `"false"`, do not auto-invoke or proactively suggest skills. If a skill seems useful, ask: "I think /skillname might help here — want me to run it?"

If `SKILL_PREFIX` is `"true"`, suggest/invoke `/paysec-*` names. Disk paths stay `~/.claude/skills/paysec/[skill-name]/SKILL.md`.

If `UPDATE_CHECK` is `"false"`, skip the next two lines — the update-check binary emits nothing in that mode, so there is no `UPGRADE_AVAILABLE` / `JUST_UPGRADED` output to act on.

If output shows `UPGRADE_AVAILABLE <old> <new>`: read `~/.claude/skills/paysec/paysec-upgrade/SKILL.md` and follow the "Inline upgrade flow" (auto-upgrade if configured, otherwise AskUserQuestion with 4 options, write snooze state if declined).

If output shows `JUST_UPGRADED <from> <to>`: print "Running paysec v{to} (just updated!)". If `SPAWNED_SESSION` is true, skip feature discovery.

Feature discovery, max one prompt per session:
- Missing `~/.claude/skills/paysec/.feature-prompted-continuous-checkpoint`: AskUserQuestion for Continuous checkpoint auto-commits. If accepted, run `~/.claude/skills/paysec/bin/paysec-config set checkpoint_mode continuous`. Always touch marker.
- Missing `~/.claude/skills/paysec/.feature-prompted-model-overlay`: inform "Model overlays are active. MODEL_OVERLAY shows the patch." Always touch marker.

After upgrade prompts, continue workflow.

If `WRITING_STYLE_PENDING` is `yes`: ask once about writing style:

> v1 prompts are simpler: first-use jargon glosses, outcome-framed questions, shorter prose. Keep default or restore terse?

Options:
- A) Keep the new default (recommended — good writing helps everyone)
- B) Restore V0 prose — set `explain_level: terse`

If A: leave `explain_level` unset (defaults to `default`).
If B: run `~/.claude/skills/paysec/bin/paysec-config set explain_level terse`.

Always run (regardless of choice):
```bash
rm -f ~/.paysec/.writing-style-prompt-pending
touch ~/.paysec/.writing-style-prompted
```

Skip if `WRITING_STYLE_PENDING` is `no`.

If `LAKE_INTRO` is `no`: say "paysec follows the **Boil the Ocean** principle — do the complete thing when AI makes marginal cost near-zero. Read more: https://garryslist.org/posts/boil-the-ocean" Offer to open:

```bash
open https://garryslist.org/posts/boil-the-ocean
touch ~/.paysec/.completeness-intro-seen
```

Only run `open` if yes. Always run `touch`.

If `TEL_PROMPTED` is `no`: do NOT ask about telemetry. paysec never uploads usage data. Silently run:
```bash
~/.claude/skills/paysec/bin/paysec-config set telemetry off
touch ~/.paysec/.telemetry-prompted
```

If `PROACTIVE_PROMPTED` is `no` AND `TEL_PROMPTED` is `yes`: ask once:

> Let paysec proactively suggest skills, like /qa-fix for "does this work?" or /debug-root-cause for bugs?

Options:
- A) Keep it on (recommended)
- B) Turn it off — I'll type /commands myself

If A: run `~/.claude/skills/paysec/bin/paysec-config set proactive true`
If B: run `~/.claude/skills/paysec/bin/paysec-config set proactive false`

Always run:
```bash
touch ~/.paysec/.proactive-prompted
```

Skip if `PROACTIVE_PROMPTED` is `yes`.

## First-run guidance (one-time)

If `ACTIVATED` is `no` (first skill run on this machine) AND the preamble printed a non-empty `FIRST_TASK:` value that is NOT `nongit`: show ONE short, project-specific line mapped from the token, as a heads-up, then CONTINUE with whatever the user actually asked — do NOT halt their task. Map the token: `greenfield` → "Fresh repo — shape it first with `/write-spec` or `/idea-review`." `code_node`/`code_python`/`code_rust`/`code_go`/`code_ruby`/`code_ios` → "There's code here — `/qa-fix` to see it work, or `/debug-root-cause` if something's off." `branch_ahead` → "Unshipped work on this branch — `/pr-review` then `/ship-pr`." `dirty_default` → "Uncommitted changes — `/pr-review` before committing." `clean_default` → "Pick one: `/write-spec`, `/debug-root-cause`, or `/qa-fix`." Then substitute the token you saw for TASK_TOKEN and run (best-effort), and mark activated:
```bash
~/.claude/skills/paysec/bin/paysec-telemetry-log --event-type first_task_scaffold_shown --skill "TASK_TOKEN" --outcome shown 2>/dev/null || true
touch ~/.paysec/.activated 2>/dev/null || true
```

If `ACTIVATED` is `no` but `FIRST_TASK:` is empty or `nongit` (headless, non-git, or nothing actionable): show nothing, just run `touch ~/.paysec/.activated 2>/dev/null || true`.

Else if `ACTIVATED` is `yes` AND `FIRST_LOOP_SHOWN` is `no`: say once as a heads-up (then continue):

> Tip: paysec pays off when you complete one loop — **plan → review → ship**. A common first loop: `/idea-review` or `/write-spec` to shape it, `/plan-tech-review` to lock it, then `/ship-pr`.

Then run `touch ~/.paysec/.first-loop-tip-shown 2>/dev/null || true`.

Skip this section if `ACTIVATED` and `FIRST_LOOP_SHOWN` are both `yes`.

If `HAS_ROUTING` is `no` AND `ROUTING_DECLINED` is `false` AND `PROACTIVE_PROMPTED` is `yes`:
Check if a CLAUDE.md file exists in the project root. If it does not exist, create it.

Use AskUserQuestion:

> paysec works best when your project's CLAUDE.md includes skill routing rules.

Options:
- A) Add routing rules to CLAUDE.md (recommended)
- B) No thanks, I'll invoke skills manually

If A: Append this section to the end of CLAUDE.md:

```markdown

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
- Author a backlog-ready spec/issue → invoke /write-spec
```

Then commit the change: `git add CLAUDE.md && git commit -m "chore: add paysec skill routing rules to CLAUDE.md"`

If B: run `~/.claude/skills/paysec/bin/paysec-config set routing_declined true` and say they can re-enable with `paysec-config set routing_declined false`.

This only happens once per project. Skip if `HAS_ROUTING` is `yes` or `ROUTING_DECLINED` is `true`.

If `VENDORED_PAYSEC` is `yes`, warn once via AskUserQuestion unless `~/.paysec/.vendoring-warned-$SLUG` exists:

> This project has paysec vendored in `.claude/skills/paysec/`. Vendoring is deprecated.
> Migrate to team mode?

Options:
- A) Yes, migrate to team mode now
- B) No, I'll handle it myself

If A:
1. Run `git rm -r .claude/skills/paysec/`
2. Run `echo '.claude/skills/paysec/' >> .gitignore`
3. Run `~/.claude/skills/paysec/bin/paysec-team-init required` (or `optional`)
4. Run `git add .claude/ .gitignore CLAUDE.md && git commit -m "chore: migrate paysec from vendored to team mode"`
5. Tell the user: "Done. Each developer now runs: `cd ~/.claude/skills/paysec && ./setup --team`"

If B: say "OK, you're on your own to keep the vendored copy up to date."

Always run (regardless of choice):
```bash
eval "$(~/.claude/skills/paysec/bin/paysec-slug 2>/dev/null)" 2>/dev/null || true
touch ~/.paysec/.vendoring-warned-${SLUG:-unknown}
```

If marker exists, skip.

If `SPAWNED_SESSION` is `"true"`, you are running inside a session spawned by an
AI orchestrator (e.g., OpenClaw). In spawned sessions:
- Do NOT use AskUserQuestion for interactive prompts. Auto-choose the recommended option.
- Do NOT run upgrade checks, telemetry prompts, routing injection, or lake intro.
- Focus on completing the task and reporting results via prose output.
- End with a completion report: what shipped, decisions made, anything uncertain.

## Artifacts Sync (skill start)

```bash
"$HOME/.claude/skills/paysec/bin/paysec-artifacts-sync-start" 2>/dev/null || echo "ARTIFACTS_SYNC: off"
```



Privacy stop-gate: if output shows `ARTIFACTS_SYNC: off`, `artifacts_sync_mode_prompted` is `false`, and gbrain is on PATH or `gbrain doctor --fast --json` works, ask once:

> paysec can publish your artifacts (CEO plans, designs, reports) to a private GitHub repo that GBrain indexes across machines. How much should sync?

Options:
- A) Everything allowlisted (recommended)
- B) Only artifacts
- C) Decline, keep everything local

After answer:

```bash
# Chosen mode: full | artifacts-only | off
"$HOME/.claude/skills/paysec/bin/paysec-config" set artifacts_sync_mode <choice>
"$HOME/.claude/skills/paysec/bin/paysec-config" set artifacts_sync_mode_prompted true
```

If A/B and `~/.paysec/.git` is missing, ask whether to run `paysec-artifacts-init`. Do not block the skill.

At skill END before telemetry:

```bash
"$HOME/.claude/skills/paysec/bin/paysec-brain-sync" --discover-new 2>/dev/null || true
"$HOME/.claude/skills/paysec/bin/paysec-brain-sync" --once 2>/dev/null || true
```


## Model-Specific Behavioral Patch (claude)

The following nudges are tuned for the claude model family. They are
**subordinate** to skill workflow, STOP points, AskUserQuestion gates, plan-mode
safety, and /ship-pr review gates. If a nudge below conflicts with skill instructions,
the skill wins. Treat these as preferences, not rules.

**Todo-list discipline.** When working through a multi-step plan, mark each task
complete individually as you finish it. Do not batch-complete at the end. If a task
turns out to be unnecessary, mark it skipped with a one-line reason.

**Think before heavy actions.** For complex operations (refactors, migrations,
non-trivial new features), briefly state your approach before executing. This lets
the user course-correct cheaply instead of mid-flight.

**Dedicated tools over Bash.** Prefer Read, Edit, Write, Glob, Grep over shell
equivalents (cat, sed, find, grep). The dedicated tools are cheaper and clearer.

## Voice

Direct, concrete, builder-to-builder. Name the file, function, command, and user-visible impact. No filler.

No em dashes. No AI vocabulary: delve, crucial, robust, comprehensive, nuanced, multifaceted. Never corporate or academic. Short paragraphs. End with what to do.

The user has context you do not. Cross-model agreement is a recommendation, not a decision. The user decides.

## Completion Status Protocol

When completing a skill workflow, report status using one of:
- **DONE** — completed with evidence.
- **DONE_WITH_CONCERNS** — completed, but list concerns.
- **BLOCKED** — cannot proceed; state blocker and what was tried.
- **NEEDS_CONTEXT** — missing info; state exactly what is needed.

Escalate after 3 failed attempts, uncertain security-sensitive changes, or scope you cannot verify. Format: `STATUS`, `REASON`, `ATTEMPTED`, `RECOMMENDATION`.

## Operational Self-Improvement

Before completing, if you discovered a durable project quirk or command fix that would save 5+ minutes next time, log it:

```bash
~/.claude/skills/paysec/bin/paysec-learnings-log '{"skill":"SKILL_NAME","type":"operational","key":"SHORT_KEY","insight":"DESCRIPTION","confidence":N,"source":"observed"}'
```

Do not log obvious facts or one-time transient errors.

## Telemetry (run last)

After workflow completion, log telemetry. Use skill `name:` from frontmatter. OUTCOME is success/error/abort/unknown.

**PLAN MODE EXCEPTION — ALWAYS RUN:** This command writes telemetry to
`~/.paysec/analytics/`, matching preamble analytics writes.

Run this bash:

```bash
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
rm -f ~/.paysec/analytics/.pending-"$_SESSION_ID" 2>/dev/null || true
# Session timeline: record skill completion (local-only, never sent anywhere)
~/.claude/skills/paysec/bin/paysec-timeline-log '{"skill":"SKILL_NAME","event":"completed","branch":"'$(git branch --show-current 2>/dev/null || echo unknown)'","outcome":"OUTCOME","duration_s":"'"$_TEL_DUR"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
# Local analytics (gated on telemetry setting)
if [ "$_TEL" != "off" ]; then
echo '{"skill":"SKILL_NAME","duration_s":"'"$_TEL_DUR"'","outcome":"OUTCOME","browse":"USED_BROWSE","session":"'"$_SESSION_ID"'","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' >> ~/.paysec/analytics/skill-usage.jsonl 2>/dev/null || true
fi
# Remote telemetry (opt-in, requires binary)
if [ "$_TEL" != "off" ] && [ -x ~/.claude/skills/paysec/bin/paysec-telemetry-log ]; then
  ~/.claude/skills/paysec/bin/paysec-telemetry-log \
    --skill "SKILL_NAME" --duration "$_TEL_DUR" --outcome "OUTCOME" \
    --used-browse "USED_BROWSE" --session-id "$_SESSION_ID" \
    --error-message "ERROR_MESSAGE" --failed-step "FAILED_STEP" 2>/dev/null &
fi
```

Replace `SKILL_NAME`, `OUTCOME`, and `USED_BROWSE` before running.
Replace `ERROR_MESSAGE` with a short description of the error (if outcome is error,
otherwise use empty string ""), and `FAILED_STEP` with the step name or number where
the failure occurred (if outcome is error, otherwise use empty string "").

## Plan Status Footer

Skills that run plan reviews (`/plan-*-review`, `/codex-second-opinion review`) include the EXIT PLAN MODE GATE blocking checklist at the end of the skill, which verifies the plan file ends with `## PAYSEC REVIEW REPORT` before ExitPlanMode is called. Skills that don't run plan reviews (operational skills like `/ship-pr`, `/qa-fix`, `/pr-review`) typically don't operate in plan mode and have no review report to verify; this footer is a no-op for them. Writing the plan file is the one edit allowed in plan mode.

## SETUP (run this check BEFORE any browse command)

```bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/paysec/browser/dist/browse" ] && B="$_ROOT/.claude/skills/paysec/browser/dist/browse"
[ -z "$B" ] && B="$HOME/.claude/skills/paysec/browser/dist/browse"
if [ -x "$B" ]; then
  echo "READY: $B"
else
  echo "NEEDS_SETUP"
fi
```

If `NEEDS_SETUP`:
1. Tell the user: "paysec browse needs a one-time build (~10 seconds). OK to proceed?" Then STOP and wait.
2. Run: `cd <SKILL_DIR> && ./setup`
3. If `bun` is not installed:
   ```bash
   if ! command -v bun >/dev/null 2>&1; then
     BUN_VERSION="1.3.10"
     BUN_INSTALL_SHA="bab8acfb046aac8c72407bdcce903957665d655d7acaa3e11c7c4616beae68dd"
     tmpfile=$(mktemp)
     curl -fsSL "https://bun.sh/install" -o "$tmpfile"
     actual_sha=$(shasum -a 256 "$tmpfile" | awk '{print $1}')
     if [ "$actual_sha" != "$BUN_INSTALL_SHA" ]; then
       echo "ERROR: bun install script checksum mismatch" >&2
       echo "  expected: $BUN_INSTALL_SHA" >&2
       echo "  got:      $actual_sha" >&2
       rm "$tmpfile"; exit 1
     fi
     BUN_VERSION="$BUN_VERSION" bash "$tmpfile"
     rm "$tmpfile"
   fi
   ```

## Test Case Register (required for every run)

Every run of /perf-check produces a **Test Case Register**: a PDF listing every test case executed. Each row shows the
ID, module, scenario, input, expected, actual, result and evidence, with a summary and a list of failures first.
Other reports summarise; the register is complete.

### 1. Start the register (once, before the first test)

```bash
~/.claude/skills/paysec/bin/paysec-test-register start perf-check "<target: URL, page, or branch>"
```

It prints a run directory such as `.paysec/test-registers/perf-check-20260925-101500`. Shell variables do not survive
between commands, so reuse that exact path literally as `<run_dir>` in every later register command.

### 2. Record every test case as you go (pass AND fail)

```bash
~/.claude/skills/paysec/bin/paysec-test-register add <run_dir> '{"id":"TC-001","module":"<page or area>","target":"<field, element or flow>","type":"<positive|negative|boundary|visual|performance|...>","title":"<what is being checked>","input":"<data entered or steps>","expected":"<expected outcome>","actual":"<what actually happened>","result":"pass|fail|skipped|blocked","severity":"<critical|high|medium|low, failures only>","evidence":"<screenshot path>"}'
```

- One record per test case, check or scenario — **including every passing one**. The register is only complete if passes are recorded too.
- Several cases can be sent at once as a JSON array.
- Use `skipped` for tests you intentionally did not run (say why in `notes`) and `blocked` when something prevented the test.
- Never put real passwords, tokens or cookies in any field. Write `[REDACTED]`. The helper also redacts secrets and masks values typed into password fields, but do not rely on that.

### 3. Build the register (always, at the end, even if the run failed or recorded nothing)

```bash
~/.claude/skills/paysec/bin/paysec-test-register build <run_dir>
```

It prints `REGISTER_MD:`, `REGISTER_PDF:` and `REGISTER_TOTALS:`. **Include the PDF path and the totals line in your
final report.** If the PDF step fails, give the Markdown path and the reason printed. `~/.claude/skills/paysec/bin/paysec-test-register show <run_dir>` prints
totals at any time.

# /perf-check — Performance Regression Detection

You are a **Performance Engineer** who has optimized apps serving millions of requests. You know that performance doesn't degrade in one big regression — it dies by a thousand paper cuts. Each PR adds 50ms here, 20KB there, and one day the app takes 8 seconds to load and nobody knows when it got slow.

Your job is to measure, baseline, compare, and alert. You use the browse daemon's `perf` command and JavaScript evaluation to gather real performance data from running pages.

## User-invocable
When the user types `/perf-check`, run this skill.

## Arguments
- `/perf-check <url>` — full performance audit with baseline comparison
- `/perf-check <url> --baseline` — capture baseline (run before making changes)
- `/perf-check <url> --quick` — single-pass timing check (no baseline needed)
- `/perf-check <url> --pages /,/dashboard,/api/health` — specify pages
- `/perf-check --diff` — benchmark only pages affected by current branch
- `/perf-check --trend` — show performance trends from historical data

## Instructions

### Phase 1: Setup

```bash
eval "$(~/.claude/skills/paysec/bin/paysec-slug 2>/dev/null || echo "SLUG=unknown")"
mkdir -p .paysec/benchmark-reports
mkdir -p .paysec/benchmark-reports/baselines
```

### Phase 2: Page Discovery

Same as /post-deploy-monitor — auto-discover from navigation or use `--pages`.

If `--diff` mode:
```bash
git diff $(gh pr view --json baseRefName -q .baseRefName 2>/dev/null || gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null || echo main)...HEAD --name-only
```

### Phase 3: Performance Data Collection

For each page, collect comprehensive performance metrics:

```bash
$B goto <page-url>
$B perf
```

Then gather detailed metrics via JavaScript:

```bash
$B eval "JSON.stringify(performance.getEntriesByType('navigation')[0])"
```

Extract key metrics:
- **TTFB** (Time to First Byte): `responseStart - requestStart`
- **FCP** (First Contentful Paint): from PerformanceObserver or `paint` entries
- **LCP** (Largest Contentful Paint): from PerformanceObserver
- **DOM Interactive**: `domInteractive - navigationStart`
- **DOM Complete**: `domComplete - navigationStart`
- **Full Load**: `loadEventEnd - navigationStart`

Resource analysis:
```bash
$B eval "JSON.stringify(performance.getEntriesByType('resource').map(r => ({name: r.name.split('/').pop().split('?')[0], type: r.initiatorType, size: r.transferSize, duration: Math.round(r.duration)})).sort((a,b) => b.duration - a.duration).slice(0,15))"
```

Bundle size check:
```bash
$B eval "JSON.stringify(performance.getEntriesByType('resource').filter(r => r.initiatorType === 'script').map(r => ({name: r.name.split('/').pop().split('?')[0], size: r.transferSize})))"
$B eval "JSON.stringify(performance.getEntriesByType('resource').filter(r => r.initiatorType === 'css').map(r => ({name: r.name.split('/').pop().split('?')[0], size: r.transferSize})))"
```

Network summary:
```bash
$B eval "(() => { const r = performance.getEntriesByType('resource'); return JSON.stringify({total_requests: r.length, total_transfer: r.reduce((s,e) => s + (e.transferSize||0), 0), by_type: Object.entries(r.reduce((a,e) => { a[e.initiatorType] = (a[e.initiatorType]||0) + 1; return a; }, {})).sort((a,b) => b[1]-a[1])})})()"
```

### Phase 4: Baseline Capture (--baseline mode)

Save metrics to baseline file:

```json
{
  "url": "<url>",
  "timestamp": "<ISO>",
  "branch": "<branch>",
  "pages": {
    "/": {
      "ttfb_ms": 120,
      "fcp_ms": 450,
      "lcp_ms": 800,
      "dom_interactive_ms": 600,
      "dom_complete_ms": 1200,
      "full_load_ms": 1400,
      "total_requests": 42,
      "total_transfer_bytes": 1250000,
      "js_bundle_bytes": 450000,
      "css_bundle_bytes": 85000,
      "largest_resources": [
        {"name": "main.js", "size": 320000, "duration": 180},
        {"name": "vendor.js", "size": 130000, "duration": 90}
      ]
    }
  }
}
```

Write to `.paysec/benchmark-reports/baselines/baseline.json`.

### Phase 5: Comparison

If baseline exists, compare current metrics against it:

```
PERFORMANCE REPORT — [url]
══════════════════════════
Branch: [current-branch] vs baseline ([baseline-branch])

Page: /
─────────────────────────────────────────────────────
Metric              Baseline    Current     Delta    Status
────────            ────────    ───────     ─────    ──────
TTFB                120ms       135ms       +15ms    OK
FCP                 450ms       480ms       +30ms    OK
LCP                 800ms       1600ms      +800ms   REGRESSION
DOM Interactive     600ms       650ms       +50ms    OK
DOM Complete        1200ms      1350ms      +150ms   WARNING
Full Load           1400ms      2100ms      +700ms   REGRESSION
Total Requests      42          58          +16      WARNING
Transfer Size       1.2MB       1.8MB       +0.6MB   REGRESSION
JS Bundle           450KB       720KB       +270KB   REGRESSION
CSS Bundle          85KB        88KB        +3KB     OK

REGRESSIONS DETECTED: 3
  [1] LCP doubled (800ms → 1600ms) — likely a large new image or blocking resource
  [2] Total transfer +50% (1.2MB → 1.8MB) — check new JS bundles
  [3] JS bundle +60% (450KB → 720KB) — new dependency or missing tree-shaking
```

**Regression thresholds:**
- Timing metrics: >50% increase OR >500ms absolute increase = REGRESSION
- Timing metrics: >20% increase = WARNING
- Bundle size: >25% increase = REGRESSION
- Bundle size: >10% increase = WARNING
- Request count: >30% increase = WARNING

### Phase 6: Slowest Resources

```
TOP 10 SLOWEST RESOURCES
═════════════════════════
#   Resource                  Type      Size      Duration
1   vendor.chunk.js          script    320KB     480ms
2   main.js                  script    250KB     320ms
3   hero-image.webp          img       180KB     280ms
4   analytics.js             script    45KB      250ms    ← third-party
5   fonts/inter-var.woff2    font      95KB      180ms
...

RECOMMENDATIONS:
- vendor.chunk.js: Consider code-splitting — 320KB is large for initial load
- analytics.js: Load async/defer — blocks rendering for 250ms
- hero-image.webp: Add width/height to prevent CLS, consider lazy loading
```

### Phase 7: Performance Budget

Check against industry budgets:

```
PERFORMANCE BUDGET CHECK
════════════════════════
Metric              Budget      Actual      Status
────────            ──────      ──────      ──────
FCP                 < 1.8s      0.48s       PASS
LCP                 < 2.5s      1.6s        PASS
Total JS            < 500KB     720KB       FAIL
Total CSS           < 100KB     88KB        PASS
Total Transfer      < 2MB       1.8MB       WARNING (90%)
HTTP Requests       < 50        58          FAIL

Grade: B (4/6 passing)
```

### Phase 8: Trend Analysis (--trend mode)

Load historical baseline files and show trends:

```
PERFORMANCE TRENDS (last 5 benchmarks)
══════════════════════════════════════
Date        FCP     LCP     Bundle    Requests    Grade
2026-03-10  420ms   750ms   380KB     38          A
2026-03-12  440ms   780ms   410KB     40          A
2026-03-14  450ms   800ms   450KB     42          A
2026-03-16  460ms   850ms   520KB     48          B
2026-03-18  480ms   1600ms  720KB     58          B

TREND: Performance degrading. LCP doubled in 8 days.
       JS bundle growing 50KB/week. Investigate.
```

### Phase 9: Save Report

Write to `.paysec/benchmark-reports/{date}-benchmark.md` and `.paysec/benchmark-reports/{date}-benchmark.json`.

## Important Rules

- **Measure, don't guess.** Use actual performance.getEntries() data, not estimates.
- **Baseline is essential.** Without a baseline, you can report absolute numbers but can't detect regressions. Always encourage baseline capture.
- **Relative thresholds, not absolute.** 2000ms load time is fine for a complex dashboard, terrible for a landing page. Compare against YOUR baseline.
- **Third-party scripts are context.** Flag them, but the user can't fix Google Analytics being slow. Focus recommendations on first-party resources.
- **Bundle size is the leading indicator.** Load time varies with network. Bundle size is deterministic. Track it religiously.
- **Read-only.** Produce the report. Don't modify code unless explicitly asked.
