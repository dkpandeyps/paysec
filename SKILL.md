---
name: paysec
preamble-tier: 1
version: 1.2.0
description: Router for the paysec skill suite. (paysec)
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
triggers:
  - paysec
  - which paysec skill
  - route this with paysec

---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->


## When to invoke this skill

Sends any paysec request to the right skill
(planning, review, QA, shipping, debugging, docs, security, design). For browser/QA
and dogfooding it points you at /browser. Use when you invoke paysec without a specific
skill, or ask "which paysec skill fits this?".

## Preamble (run first)

```bash
_PAYSEC_PREAMBLE="$HOME/.claude/skills/paysec/bin/paysec-preamble"; [ -x "$_PAYSEC_PREAMBLE" ] || _PAYSEC_PREAMBLE=".claude/skills/paysec/bin/paysec-preamble"
if [ -x "$_PAYSEC_PREAMBLE" ]; then "$_PAYSEC_PREAMBLE" --skill paysec --overlay claude --ppid "$PPID"; else echo "PAYSEC_PREAMBLE: unavailable (paysec bin not found; re-run ./setup)"; fi
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

## Route first

This is the paysec router. Its one job is to send the request to the right skill.

1. If the request is about a browser, QA, dogfooding, screenshots, or inspecting a page
   (open a site, test a deploy, take a screenshot, check a flow visually) → invoke `/browser`.
2. Otherwise, route by the rules below. If nothing matches, answer directly.

Best-effort, record which way you routed (never block on it). Set `ROUTE_OUTCOME` to
`browse` (sent to /browser), `routed` (sent to another skill), or `direct` (answered
directly, no skill matched):
```bash
~/.claude/skills/paysec/bin/paysec-telemetry-log --event-type route --skill paysec --outcome ROUTE_OUTCOME --session-id "$_SESSION_ID" 2>/dev/null || true
```

If `PROACTIVE` is `false`: do NOT proactively invoke or suggest other paysec skills during
this session. Only run skills the user explicitly invokes. This preference persists across
sessions via `paysec-config`.

If `PROACTIVE` is `true` (default): **invoke the Skill tool** when the user's request
matches a skill's purpose. Do NOT answer directly when a skill exists for the task.
Use the Skill tool to invoke it. The skill has specialized workflows, checklists, and
quality gates that produce better results than answering inline.

**Routing rules — when you see these patterns, INVOKE the skill via the Skill tool:**
- User describes a new idea, asks "is this worth building", brainstorms, pitches a concept → invoke `/idea-review`
- User asks to spec something out, file an issue, write up a ticket, "turn this into a GitHub issue", "backlog item" → invoke `/write-spec`
- User asks about strategy, scope, ambition, "think bigger", "what should we build" → invoke `/plan-business-review`
- User asks to review architecture, lock in the plan, "does this design make sense" → invoke `/plan-tech-review`
- User asks about design system, brand, visual identity, "how should this look" → invoke `/design-system`
- User asks to review design of a plan → invoke `/plan-ux-review`
- User asks about developer experience of a plan, API/CLI/SDK design → invoke `/plan-dx-review`
- User wants all reviews done automatically, "review everything" → invoke `/auto-plan-review`
- User reports a bug, error, broken behavior, "why is this broken", "this doesn't work", "wtf", "something's wrong" → invoke `/debug-root-cause`
- User asks to test the site, find bugs, QA, "does this work", "check the deploy" → invoke `/qa-fix`
- User asks to just report bugs without fixing → invoke `/qa-report`
- User asks to review code, check the diff, pre-landing review, "look at my changes" → invoke `/pr-review`
- User asks about visual polish, design audit of a live site, "this looks off" → invoke `/design-qa`
- User asks to audit the live developer experience, time-to-hello-world → invoke `/dx-audit`
- User asks to ship, deploy, push, create a PR, "let's land this", "send it" → invoke `/ship-pr`
- User asks to merge + deploy + verify as one flow → invoke `/merge-and-deploy`
- User asks to configure deployment for the project → invoke `/deploy-setup`
- User asks to monitor prod after shipping, post-deploy checks → invoke `/post-deploy-monitor`
- User asks to update docs after shipping → invoke `/docs-release-update`
- User asks to write docs from scratch, generate documentation, "document this feature/module" → invoke `/docs-generate`
- User asks for a weekly retro, what did we ship, "how'd we do" → invoke `/weekly-retro`
- User asks for a second opinion, codex review → invoke `/codex-second-opinion`
- User asks for safety mode, careful mode → invoke `/safe-mode` or `/full-guard`
- User asks to restrict edits to a directory → invoke `/lock-edits` or `/unlock-edits`
- User asks to upgrade paysec → invoke `/paysec-upgrade`
- User asks to save progress, checkpoint, "save my work" → invoke `/save-context`
- User asks to resume, restore, "where was I" → invoke `/restore-context`
- User asks about security, OWASP, vulnerabilities, "is this secure" → invoke `/security-audit`
- User asks to make a PDF, document, publication → invoke `/md-to-pdf`
- User asks to launch a real browser for QA, "open the browser" → invoke `/open-paysec-browser`
- User asks to import cookies for authenticated testing → invoke `/import-browser-cookies`
- User asks about page speed, performance regression, benchmarks → invoke `/perf-check`
- User asks what paysec has learned, "show learnings" → invoke `/learnings`
- User asks to tune question sensitivity, "stop asking me that" → invoke `/tune-questions`
- User asks for code quality dashboard, "health check" → invoke `/code-health`

**When in doubt, invoke the skill.** A false positive (invoking a skill that wasn't
needed) is cheaper than a false negative (answering ad-hoc when a structured workflow
exists). The skill provides multi-step workflows, checklists, and quality gates that
always produce better results than an ad-hoc answer. If no skill matches, answer
directly as usual.

If the user opts out of suggestions, run `paysec-config set proactive false`.
If they opt back in, run `paysec-config set proactive true`.
