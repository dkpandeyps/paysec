import type { TemplateContext } from '../types';

export function generateContextHealth(ctx?: TemplateContext): string {
  if (ctx?.explainLevel === 'terse') return '';
  return `## Context Health (soft directive)

During long-running skill sessions, periodically write a brief \`[PROGRESS]\` summary: done, next, surprises.

If you are looping on the same diagnostic, same file, or failed fix variants, STOP and reassess. Consider escalation or /save-context. Progress summaries must NEVER mutate git state.`;
}

// Preamble Composition (tier → sections)
// ─────────────────────────────────────────────
// T1: core + upgrade + lake + telemetry + voice(trimmed) + completion
// T2: T1 + voice(full) + ask + completeness + context-recovery
// T3: T2 + repo-mode + search
// T4: (same as T3 — TEST_FAILURE_TRIAGE is a separate {{}} placeholder, not preamble)
//
// Skills by tier:
//   T1: browse, setup-cookies, benchmark
//   T2: investigate, security-audit, retro, doc-release, deploy-setup, canary, checkpoint, health
//   T3: auto-plan-review, codex, design-consult, idea-review, ceo/design/eng-review
//   T4: ship, review, qa, qa-report, design-qa, land-deploy
