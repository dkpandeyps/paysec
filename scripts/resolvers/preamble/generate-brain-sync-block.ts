/**
 * artifacts-sync preamble block (renamed from gbrain-sync in v1.27.0.0).
 *
 * Emits a one-line call to bin/paysec-artifacts-sync-start, which runs at
 * every skill invocation (the body used to be inlined here, ~4.5KB of bash the
 * agent re-typed on every skill start; stdout is unchanged):
 *   0. Live gbrain-availability hint (per /plan-tech-review): when gbrain is
 *      configured, emit one of two variants (steady-state vs empty-corpus
 *      emergency). Zero context cost when gbrain is not configured.
 *   1. If ~/.paysec-artifacts-remote.txt (or legacy ~/.paysec-brain-remote.txt
 *      during the v1.27.0.0 migration window) exists AND ~/.paysec/.git is
 *      missing, surface a restore-available hint (does NOT auto-run restore).
 *   2. If sync is on, run `paysec-brain-sync --once` (drain + push). The
 *      script keeps its old name; only the config-key + state-file names flip.
 *   3. On first skill of the day (24h cache via .brain-last-pull):
 *      `git fetch` + ff-only merge (JSONL merge driver handles conflicts).
 *   4. Emit an `ARTIFACTS_SYNC:` status line so every skill surfaces health.
 *      In remote-MCP mode, the line reads `ARTIFACTS_SYNC: remote-mode
 *      (managed by brain server <host>)` since this machine doesn't sync
 *      anything locally — the brain admin's server pulls from GitHub/GitLab.
 *
 * Also emits prose instructions for the host LLM to fire a one-time privacy
 * stop-gate via AskUserQuestion when artifacts_sync_mode is unset and gbrain
 * is available on the host.
 *
 * Block emitted across all tiers. If the script is missing (install outside
 * the host skill root) the fallback echoes "ARTIFACTS_SYNC: off", matching the
 * old inline behavior when paysec-config was unreachable. The script short-circuits when feature
 * is disabled; cost is <5ms.
 *
 * Skill-end sync is handled by the completion-status generator via a call
 * to `paysec-brain-sync --discover-new` + `--once`.
 */
import type { TemplateContext } from '../types';
import { quoteSafePath } from '../types';

export function generateBrainSyncBlock(ctx: TemplateContext): string {
  const isBrainHost = ctx.host === 'gbrain' || ctx.host === 'hermes';
  return `## Artifacts Sync (skill start)

\`\`\`bash
"${quoteSafePath(ctx.paths.binDir)}/paysec-artifacts-sync-start" 2>/dev/null || echo "ARTIFACTS_SYNC: off"
\`\`\`

${isBrainHost ? `If output shows \`ARTIFACTS_SYNC: artifacts repo detected\`, offer \`paysec-brain-restore\` via AskUserQuestion; otherwise continue.` : ''}

Privacy stop-gate: if output shows \`ARTIFACTS_SYNC: off\`, \`artifacts_sync_mode_prompted\` is \`false\`, and gbrain is on PATH or \`gbrain doctor --fast --json\` works, ask once:

> paysec can publish your artifacts (CEO plans, designs, reports) to a private GitHub repo that GBrain indexes across machines. How much should sync?

Options:
- A) Everything allowlisted (recommended)
- B) Only artifacts
- C) Decline, keep everything local

After answer:

\`\`\`bash
# Chosen mode: full | artifacts-only | off
"${quoteSafePath(ctx.paths.binDir)}/paysec-config" set artifacts_sync_mode <choice>
"${quoteSafePath(ctx.paths.binDir)}/paysec-config" set artifacts_sync_mode_prompted true
\`\`\`

If A/B and \`~/.paysec/.git\` is missing, ask whether to run \`paysec-artifacts-init\`. Do not block the skill.

At skill END before telemetry:

\`\`\`bash
"${quoteSafePath(ctx.paths.binDir)}/paysec-brain-sync" --discover-new 2>/dev/null || true
"${quoteSafePath(ctx.paths.binDir)}/paysec-brain-sync" --once 2>/dev/null || true
\`\`\`
`;
}
