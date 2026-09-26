/**
 * Skill coverage matrix (v1.45.0.0 T1, cathedral Phase 0).
 *
 * Single source of truth mapping each paysec skill to its E2E test files.
 * The CI gate at test/skill-coverage-matrix.test.ts fails if a skill has
 * no gate-tier entry, ensuring the eval-first foundation holds: every
 * skill has at least one CI-blocking check that asserts must-have
 * behavior.
 *
 * Two tiers per entry:
 *   gate     CI-blocking, runs on every PR, target <$0.50/test or free.
 *   periodic Weekly cron, deeper coverage, can cost ~$1-$3/test.
 *
 * The 'floor' entry refers to test/skill-coverage-floor.test.ts —
 * a structural-compliance smoke test that covers every skill with
 * file-IO checks (free, no LLM cost). When a skill has only 'floor'
 * coverage, that's the eval-first minimum; future work can layer
 * behavioral checks on top.
 */

export interface SkillCoverage {
  /** Gate-tier test file paths (relative to repo root). At least one required per skill. */
  gate: string[];
  /** Periodic-tier test file paths. Optional but recommended. */
  periodic: string[];
  /** Brief note on why this coverage is the right shape for this skill. */
  rationale?: string;
}

/**
 * Per-skill coverage. Keys MUST match the top-level skill directory name.
 * The CI test asserts every skill in the repo has an entry here AND that
 * gate[] is non-empty.
 *
 * Adding a new skill: add an entry here AND either reference an existing
 * test that covers it OR add 'test/skill-coverage-floor.test.ts' as the
 * minimum gate-tier check.
 */
export const SKILL_COVERAGE: Record<string, SkillCoverage> = {
  // ─── Core loop ──────────────────────────────────────────────
  'ship-pr': {
    gate: ['test/skill-e2e-ship-pr-idempotency.test.ts', 'test/skill-coverage-floor.test.ts'],
    periodic: ['test/skill-e2e-workflow.test.ts'],
  },
  'pr-review': {
    gate: ['test/skill-e2e-pr-review.test.ts', 'test/skill-coverage-floor.test.ts'],
    periodic: ['test/skill-e2e-pr-review-army.test.ts', 'test/regression-1539-review-self-verify.test.ts'],
  },
  'qa-fix': {
    gate: ['test/skill-e2e-qa-fix-workflow.test.ts', 'test/skill-coverage-floor.test.ts'],
    periodic: ['test/skill-e2e-qa-fix-bugs.test.ts'],
  },
  'qa-report': {
    gate: ['test/skill-coverage-floor.test.ts'],
    periodic: [],
    rationale: 'qa-report is qa with --report-only; behavior tested via /qa-fix coverage.',
  },
  'debug-root-cause': {
    gate: ['test/skill-coverage-floor.test.ts'],
    periodic: [],
  },
  'browser': {
    gate: ['test/skill-coverage-floor.test.ts'],
    periodic: [],
    rationale: 'browse binary has its own integration suite under browser/test/.',
  },
  'write-spec': {
    gate: [
      'test/spec-template-invariants.test.ts',
      'test/spec-template-sync.test.ts',
      'test/skill-coverage-floor.test.ts',
    ],
    periodic: [
      'test/skill-e2e-write-spec-execute.test.ts',
      'test/skill-llm-eval-spec.test.ts',
    ],
    rationale: '37 deterministic invariants pin Phase 1/3 gating, --execute race/security hardening, quality-gate redaction, archive contract, plan-mode-aware Phase 5. Periodic adds full PTY pipeline + LLM-judge.',
  },

  // ─── Plan triad ─────────────────────────────────────────────
  'plan-business-review': {
    gate: [
      'test/skill-e2e-plan-business-finding-floor.test.ts',
      'test/skill-e2e-plan-business-plan-mode.test.ts',
      'test/skill-coverage-floor.test.ts',
    ],
    periodic: [
      'test/skill-e2e-plan-business-finding-count.test.ts',
      'test/skill-e2e-plan-business-mode-routing.test.ts',
    ],
  },
  'plan-tech-review': {
    gate: [
      'test/skill-e2e-plan-tech-finding-floor.test.ts',
      'test/skill-e2e-plan-tech-plan-mode.test.ts',
      'test/skill-coverage-floor.test.ts',
    ],
    periodic: [
      'test/skill-e2e-plan-tech-finding-count.test.ts',
      'test/skill-e2e-plan-tech-multi-finding-batching.test.ts',
    ],
  },
  'plan-ux-review': {
    gate: [
      'test/skill-e2e-plan-ux-finding-floor.test.ts',
      'test/skill-e2e-plan-ux-plan-mode.test.ts',
      'test/skill-e2e-plan-ux-with-ui.test.ts',
      'test/skill-coverage-floor.test.ts',
    ],
    periodic: ['test/skill-e2e-plan-ux-finding-count.test.ts'],
  },
  'plan-dx-review': {
    gate: [
      'test/skill-e2e-plan-dx-finding-floor.test.ts',
      'test/skill-e2e-plan-dx-plan-mode.test.ts',
      'test/skill-coverage-floor.test.ts',
    ],
    periodic: ['test/skill-e2e-plan-dx-finding-count.test.ts'],
  },
  'auto-plan-review': {
    gate: ['test/skill-coverage-floor.test.ts'],
    periodic: ['test/skill-e2e-auto-plan-review-chain.test.ts', 'test/skill-e2e-auto-plan-review-dual-voice.test.ts'],
  },
  'idea-review': {
    gate: ['test/skill-e2e-idea-review.test.ts', 'test/skill-coverage-floor.test.ts'],
    periodic: ['test/skill-e2e-idea-review-auto-mode.test.ts', 'test/skill-e2e-idea-review-phase4.test.ts'],
  },

  // ─── Polish + design ────────────────────────────────────────
  'design-qa': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'design-system': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'design-variants': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'design-to-html': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'make-diagram': {
    gate: ['test/skill-e2e-make-diagram.test.ts', 'test/skill-coverage-floor.test.ts'],
    periodic: ['test/skill-e2e-make-diagram.test.ts'],
    rationale: 'Triplet contract is gate-tier deterministic; authoring-quality judge is periodic (E2E_TIERS: diagram-triplet/diagram-authoring-quality).',
  },
  'security-audit': {
    gate: ['test/skill-e2e-security-audit.test.ts', 'test/cso-preserved.test.ts', 'test/skill-coverage-floor.test.ts'],
    periodic: [],
    rationale: 'cso-preserved.test.ts pins must-not-strip security guidance phrases.',
  },
  'docs-release-update': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'docs-generate': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },

  // ─── Ops + integrations ─────────────────────────────────────
  'merge-and-deploy': { gate: ['test/skill-e2e-deploy.test.ts', 'test/skill-coverage-floor.test.ts'], periodic: [] },
  'post-deploy-monitor': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'perf-check': { gate: ['test/skill-e2e-benchmark-providers.test.ts', 'test/skill-coverage-floor.test.ts'], periodic: [] },
  'model-benchmark': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'codex-second-opinion': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'weekly-retro': {
    gate: ['test/skill-coverage-floor.test.ts'],
    periodic: ['test/regression-1624-retro-stale-base.test.ts'],
  },
  'paysec-upgrade': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'save-context': { gate: ['test/skill-e2e-context-skills.test.ts', 'test/skill-coverage-floor.test.ts'], periodic: [] },
  'restore-context': { gate: ['test/skill-e2e-context-skills.test.ts', 'test/skill-coverage-floor.test.ts'], periodic: [] },
  'deploy-setup': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'import-browser-cookies': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'brain-setup': {
    gate: [
      'test/skill-e2e-brain-setup-bad-token.test.ts',
      'test/skill-e2e-brain-setup-path4-local-pglite.test.ts',
      'test/skill-e2e-brain-setup-remote.test.ts',
      'test/skill-coverage-floor.test.ts',
    ],
    periodic: [],
  },
  'brain-sync': {
    gate: ['test/skill-coverage-floor.test.ts'],
    periodic: ['test/regression-1611-gbrain-sync-resume.test.ts'],
  },
  'open-paysec-browser': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'pair-remote-agent': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'web-scrape': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'save-scrape-skill': { gate: ['test/skill-e2e-save-scrape-skill.test.ts', 'test/skill-coverage-floor.test.ts'], periodic: [] },
  'learnings': { gate: ['test/skill-e2e-learnings.test.ts', 'test/skill-coverage-floor.test.ts'], periodic: [] },
  'tune-questions': { gate: ['test/skill-e2e-tune-questions.test.ts', 'test/skill-coverage-floor.test.ts'], periodic: [] },

  // ─── iOS family ─────────────────────────────────────────────
  'ios-device-qa': { gate: ['test/skill-e2e-ios.test.ts', 'test/skill-coverage-floor.test.ts'], periodic: ['test/skill-e2e-ios-device.test.ts', 'test/skill-e2e-ios-swift-build.test.ts'] },
  'ios-auto-fix': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'ios-remove-debug': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'ios-bridge-sync': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'ios-design-audit': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },

  // ─── Safety / housekeeping ──────────────────────────────────
  'safe-mode': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'lock-edits': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'unlock-edits': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'full-guard': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'merge-queue-report': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'code-health': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'md-to-pdf': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
  'dx-audit': { gate: ['test/skill-coverage-floor.test.ts'], periodic: [] },
};
