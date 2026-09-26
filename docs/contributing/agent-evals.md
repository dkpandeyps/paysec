# Running evals as an agent: always detach (SIGTERM-proof)

_Moved verbatim from CLAUDE.md so it loads only when needed. CLAUDE.md keeps the must-follow rules and a pointer here._


When **you (an agent/harness)** launch a long eval/benchmark run, run it through
`bin/paysec-detach` — NEVER as a plain backgrounded Bash task. A plain background
task lives in the harness's process group, so a SIGTERM ("polite quit") on a turn
boundary, a stopped Monitor, or an interruption kills the run mid-flight (observed:
`script "test:gate" was terminated by signal SIGTERM` ~40 min into a run). On macOS
the run can also die to idle-sleep. `paysec-detach` fixes both: a fresh session
(escapes the group SIGTERM) wrapped in `caffeinate -i` (blocks idle-sleep).

- Use the `eval:bg*` scripts (`eval:bg`, `eval:bg:all`, `eval:bg:gate`,
  `eval:bg:periodic`) — they wrap the eval command in `paysec-detach` with the
  machine-wide `paysec-evals` lock (concurrent worktrees serialize instead of
  saturating the shared model API), a per-tier watchdog, and a **run-scoped** log
  under `~/.paysec-dev/eval-runs/` (no shared-`/tmp` collision). Each prints its
  log path. `eval:bg:gate` / `eval:bg:periodic` run their tier through the
  sharded paid runner (`scripts/test-paid-shards.ts`, also exposed as
  `test:gate:sharded` / `test:periodic:sharded`): one Bun process per test
  file, an external wall-clock timeout that kills the shard's process GROUP
  (stray `claude`/`codex` grandchildren included), a per-shard
  `PAYSEC_EVAL_DIR=<evalDir>/shards/<slug>/` honored by the `EvalCollector`
  constructor, and an aggregate that separates failed vs timed-out vs
  never-started shards — the detach timeouts (25200s gate / 32400s periodic;
  floor enforced against the live shard census by
  test/eval-detach-timeout-floor.test.ts)
  are sized against worst-case shard wall clock. `EVALS_JOBS` sets the shard
  process count (default 4); `EVALS_CONCURRENCY` is bun's --max-concurrency
  WITHIN a shard (default 4) — they are deliberately separate knobs. `eval:list` / `eval:compare` /
  `eval:summary` read the shard dirs too. Or call
  `paysec-detach [--lock NAME] [--timeout SECS] [--label LBL] --
  <cmd>` directly for any long agent job. Export `ANTHROPIC_API_KEY` first (never
  pass keys in argv).
- Then **poll the printed logfile** with a death-aware watcher: break on the
  guaranteed `### paysec-detach EXIT=<code> ###` sentinel (success AND failure are
  both marked, so silence is never mistaken for success). The detached run survives
  even if your watcher gets reaped, so re-checking the log always works.
- Why the lock: a shared dev box with several Conductor worktrees will rate-limit
  the model API if two eval suites run at once (15-way concurrency each), which
  mass-times-out E2E tests. The lock makes the second run WAIT, not collide.
- Humans running `bun run test:evals` foreground in their own terminal don't need
  this — Ctrl-C is intended there. Detachment is for agent-launched runs only.
