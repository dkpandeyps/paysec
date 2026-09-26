/**
 * Question Registry — typed schema for AskUserQuestion invocations across paysec.
 *
 * Purpose
 * -------
 * Every AskUserQuestion invocation is tagged with a stable question_id that maps
 * to an entry in this registry. The registry is the substrate /tune-questions builds on:
 * - Logging (question-log.jsonl) tags events with a registered id
 * - Per-question preferences (question-preferences.json) are keyed by registered id
 * - One-way door safety is declared here, not inferred from prose summaries
 * - The psychographic signal map (scripts/psychographic-signals.ts) maps id → dimension delta
 *
 * Not every AskUserQuestion in paysec needs a registry entry right away. Skills
 * often craft questions dynamically at runtime — the agent generates an ad-hoc id
 * of the form `{skill}-{slug}` for those. The /tune-questions skill surfaces frequently-
 * firing ad-hoc ids as candidates for registry promotion.
 *
 * v1 coverage target: the ~30-50 most-common recurring question categories across
 * ship, review, idea-review, plan-business-review, plan-tech-review, plan-ux-review,
 * plan-dx-review, qa, investigate, and merge-and-deploy. One-way doors 100%.
 *
 * Adding a new entry
 * ------------------
 * 1. Pick a kebab-case id of the form `{skill}-{what-it-asks-about}`.
 * 2. Classify `door_type`:
 *    - `one-way` for destructive ops, architecture/data-model forks,
 *      scope-adds > 1 day CC effort, security/compliance choices.
 *      ALWAYS asked regardless of user preference.
 *    - `two-way` for everything else (can be auto-decided by explicit preference).
 * 3. Pick the `category` that describes the question's shape.
 * 4. Add an optional `signal_key` if this question's answer should nudge a
 *    specific psychographic dimension. The signal map in scripts/psychographic-
 *    signals.ts uses (id, user_choice) to look up the dimension delta.
 * 5. `options` is a short list of stable option keys. UI labels can vary; keys
 *    must stay the same so preferences survive wording changes.
 * 6. Run `bun test test/tune-questions.test.ts` to verify format + uniqueness.
 */

export type QuestionCategory =
  | 'approval'         // proceed/stop gate (e.g., "approve this plan?")
  | 'clarification'    // need more info to proceed
  | 'routing'          // which path to take (modes, strategies)
  | 'cherry-pick'      // opt-in scope decision (add/defer/skip)
  | 'feedback-loop';   // inline tune: prompt, iteration feedback

export type DoorType = 'one-way' | 'two-way';

/**
 * Stable keys for the most-common user choice patterns. UI labels can vary
 * (e.g., "Add to plan" vs "Include in scope"); the stored choice is the key.
 * Skills may emit custom keys for uncategorizable questions — those still log
 * but don't get psychographic signal attribution.
 */
export type StandardOption =
  | 'accept'
  | 'reject'
  | 'defer'
  | 'skip'
  | 'investigate'
  | 'approve'
  | 'deny'
  | 'expand'
  | 'hold'
  | 'reduce'
  | 'selective'
  | 'fix-now'
  | 'fix-later'
  | 'ack-and-ship'
  | 'false-positive'
  | 'continue'
  | 'rerun'
  | 'stop';

export interface QuestionDef {
  /** Stable kebab-case id: `{skill}-{semantic-description}` */
  id: string;
  /** Skill that owns this question (must match a paysec skill directory name) */
  skill: string;
  /** Shape of the question */
  category: QuestionCategory;
  /** Safety classification. one-way is ALWAYS asked regardless of preference */
  door_type: DoorType;
  /** Stable option keys (skills may emit keys outside this list; those are logged but untagged) */
  options?: StandardOption[] | string[];
  /** Optional key into scripts/psychographic-signals.ts for dimension attribution */
  signal_key?: string;
  /** One-line description for docs and /tune-questions profile output */
  description: string;
}

/**
 * QUESTIONS — initial v1 coverage of recurring question categories.
 * Grouped by skill for readability. Maintained by hand.
 *
 * When adding new skills or question types, extend this object. The CI lint
 * test/tune-questions.test.ts verifies format, uniqueness, and required fields.
 */
export const QUESTIONS = {
  // -----------------------------------------------------------------------
  // /ship-pr — pre-landing review, deploy, PR creation
  // -----------------------------------------------------------------------
  'ship-pr-release-pipeline-missing': {
    id: 'ship-pr-release-pipeline-missing',
    skill: 'ship-pr',
    category: 'approval',
    door_type: 'two-way',
    options: ['accept', 'defer', 'skip'],
    signal_key: 'distribution-care',
    description: "New artifact added without CI/CD release pipeline — add now, defer to TODOs, or skip?",
  },
  'ship-pr-test-failure-triage': {
    id: 'ship-pr-test-failure-triage',
    skill: 'ship-pr',
    category: 'approval',
    door_type: 'one-way',
    options: ['fix-now', 'investigate', 'ack-and-ship'],
    signal_key: 'test-discipline',
    description: "Failing tests detected — fix before shipping or investigate root cause?",
  },
  'ship-pr-pre-landing-review-fix': {
    id: 'ship-pr-pre-landing-review-fix',
    skill: 'ship-pr',
    category: 'approval',
    door_type: 'two-way',
    options: ['fix-now', 'skip'],
    signal_key: 'code-quality-care',
    description: "Pre-landing review flagged an issue — fix now or ship as-is?",
  },
  'ship-pr-greptile-comment-valid': {
    id: 'ship-pr-greptile-comment-valid',
    skill: 'ship-pr',
    category: 'approval',
    door_type: 'two-way',
    options: ['fix-now', 'ack-and-ship', 'false-positive'],
    signal_key: 'code-quality-care',
    description: "Greptile flagged a valid issue — fix, ack and ship, or mark false positive?",
  },
  'ship-pr-greptile-comment-false-positive': {
    id: 'ship-pr-greptile-comment-false-positive',
    skill: 'ship-pr',
    category: 'approval',
    door_type: 'two-way',
    options: ['reply', 'fix-anyway', 'ignore'],
    description: "Greptile comment looks like a false positive — reply to explain, fix anyway, or ignore silently?",
  },
  'ship-pr-todos-create': {
    id: 'ship-pr-todos-create',
    skill: 'ship-pr',
    category: 'approval',
    door_type: 'two-way',
    options: ['accept', 'skip'],
    description: "No TODOS.md found — create a skeleton file now?",
  },
  'ship-pr-todos-reorganize': {
    id: 'ship-pr-todos-reorganize',
    skill: 'ship-pr',
    category: 'approval',
    door_type: 'two-way',
    options: ['accept', 'skip'],
    signal_key: 'detail-preference',
    description: "TODOS.md doesn't follow the recommended structure — reorganize now?",
  },
  'ship-pr-changelog-voice-polish': {
    id: 'ship-pr-changelog-voice-polish',
    skill: 'ship-pr',
    category: 'approval',
    door_type: 'two-way',
    options: ['accept', 'skip'],
    signal_key: 'detail-preference',
    description: "CHANGELOG entry could be polished for voice — apply edits?",
  },
  'ship-pr-version-bump-tier': {
    id: 'ship-pr-version-bump-tier',
    skill: 'ship-pr',
    category: 'routing',
    door_type: 'two-way',
    options: ['major', 'minor', 'patch'],
    description: "Version bump: major, minor, or patch?",
  },

  // -----------------------------------------------------------------------
  // /pr-review — pre-landing code review
  // -----------------------------------------------------------------------
  'pr-review-finding-fix': {
    id: 'pr-review-finding-fix',
    skill: 'pr-review',
    category: 'approval',
    door_type: 'two-way',
    options: ['fix-now', 'ack-and-ship', 'false-positive'],
    signal_key: 'code-quality-care',
    description: "Review finding — fix now, ack and ship, or false positive?",
  },
  'pr-review-sql-safety': {
    id: 'pr-review-sql-safety',
    skill: 'pr-review',
    category: 'approval',
    door_type: 'one-way',
    options: ['fix-now', 'investigate'],
    description: "Potential SQL injection / unsafe query — fix or investigate further?",
  },
  'pr-review-llm-trust-boundary': {
    id: 'pr-review-llm-trust-boundary',
    skill: 'pr-review',
    category: 'approval',
    door_type: 'one-way',
    options: ['fix-now', 'investigate'],
    description: "LLM trust boundary violation — fix before merge?",
  },

  // -----------------------------------------------------------------------
  // /idea-review — YC diagnostic + builder brainstorm
  // -----------------------------------------------------------------------
  'idea-review-mode-goal': {
    id: 'idea-review-mode-goal',
    skill: 'idea-review',
    category: 'routing',
    door_type: 'two-way',
    options: ['startup', 'intrapreneur', 'hackathon', 'oss-research', 'learning', 'fun'],
    signal_key: 'session-mode',
    description: "What's your goal with this session? (Sets mode: startup vs builder)",
  },
  'idea-review-premise-confirm': {
    id: 'idea-review-premise-confirm',
    skill: 'idea-review',
    category: 'approval',
    door_type: 'two-way',
    options: ['accept', 'reject'],
    description: "Premise check — agree or disagree?",
  },
  'idea-review-cross-model-run': {
    id: 'idea-review-cross-model-run',
    skill: 'idea-review',
    category: 'approval',
    door_type: 'two-way',
    options: ['accept', 'skip'],
    description: "Want a second-opinion cross-model review of your brainstorm?",
  },
  'idea-review-landscape-privacy-gate': {
    id: 'idea-review-landscape-privacy-gate',
    skill: 'idea-review',
    category: 'approval',
    door_type: 'one-way',
    options: ['accept', 'skip'],
    description: "Run a web search for landscape awareness? (Sends generalized terms to search provider.)",
  },
  'idea-review-approach-choose': {
    id: 'idea-review-approach-choose',
    skill: 'idea-review',
    category: 'routing',
    door_type: 'two-way',
    options: ['minimal', 'ideal', 'creative'],
    signal_key: 'scope-appetite',
    description: "Which implementation approach? (minimal viable vs ideal architecture vs creative lateral)",
  },
  'idea-review-design-doc-approve': {
    id: 'idea-review-design-doc-approve',
    skill: 'idea-review',
    category: 'approval',
    door_type: 'two-way',
    options: ['accept', 'revise', 'restart'],
    description: "Approve the design doc, revise sections, or start over?",
  },

  // -----------------------------------------------------------------------
  // /plan-business-review — scope & strategy
  // -----------------------------------------------------------------------
  'plan-business-review-mode': {
    id: 'plan-business-review-mode',
    skill: 'plan-business-review',
    category: 'routing',
    door_type: 'two-way',
    options: ['expand', 'selective', 'hold', 'reduce'],
    signal_key: 'scope-appetite',
    description: "Review mode: push scope up, cherry-pick expansions, hold scope, or cut to minimum?",
  },
  'plan-business-review-expansion-proposal': {
    id: 'plan-business-review-expansion-proposal',
    skill: 'plan-business-review',
    category: 'cherry-pick',
    door_type: 'two-way',
    options: ['accept', 'defer', 'skip'],
    signal_key: 'scope-appetite',
    description: "Scope expansion proposal — add to plan, defer to TODOs, or skip?",
  },
  'plan-business-review-premise-revise': {
    id: 'plan-business-review-premise-revise',
    skill: 'plan-business-review',
    category: 'approval',
    door_type: 'one-way',
    options: ['revise', 'hold'],
    description: "Cross-model challenged an agreed premise — revise or keep?",
  },
  'plan-business-review-outside-voice': {
    id: 'plan-business-review-outside-voice',
    skill: 'plan-business-review',
    category: 'approval',
    door_type: 'two-way',
    options: ['accept', 'skip'],
    description: "Get an outside-voice second opinion on the plan?",
  },
  'plan-business-review-promote-to-docs': {
    id: 'plan-business-review-promote-to-docs',
    skill: 'plan-business-review',
    category: 'approval',
    door_type: 'two-way',
    options: ['accept', 'keep-local', 'skip'],
    description: "Promote the CEO plan to docs/designs/ in the repo?",
  },

  // -----------------------------------------------------------------------
  // /plan-tech-review — architecture & tests (required gate)
  // -----------------------------------------------------------------------
  'plan-tech-review-arch-finding': {
    id: 'plan-tech-review-arch-finding',
    skill: 'plan-tech-review',
    category: 'approval',
    door_type: 'one-way',
    options: ['fix-now', 'defer', 'accept-risk'],
    signal_key: 'architecture-care',
    description: "Architecture finding — fix, defer, or accept the risk?",
  },
  'plan-tech-review-scope-reduce': {
    id: 'plan-tech-review-scope-reduce',
    skill: 'plan-tech-review',
    category: 'routing',
    door_type: 'two-way',
    options: ['reduce', 'hold'],
    signal_key: 'scope-appetite',
    description: "Plan touches 8+ files — reduce scope or hold?",
  },
  'plan-tech-review-test-gap': {
    id: 'plan-tech-review-test-gap',
    skill: 'plan-tech-review',
    category: 'approval',
    door_type: 'two-way',
    options: ['add-test', 'defer', 'skip'],
    signal_key: 'test-discipline',
    description: "Test gap identified — add now, defer, or skip?",
  },
  'plan-tech-review-outside-voice': {
    id: 'plan-tech-review-outside-voice',
    skill: 'plan-tech-review',
    category: 'approval',
    door_type: 'two-way',
    options: ['accept', 'skip'],
    description: "Get an outside-voice second opinion on the plan?",
  },
  'plan-tech-review-todo-add': {
    id: 'plan-tech-review-todo-add',
    skill: 'plan-tech-review',
    category: 'cherry-pick',
    door_type: 'two-way',
    options: ['accept', 'skip', 'build-now'],
    description: "Proposed TODO item — add to TODOs, skip, or build in this PR?",
  },

  // -----------------------------------------------------------------------
  // /plan-ux-review — UI/UX plan audit
  // -----------------------------------------------------------------------
  'plan-ux-review-mode': {
    id: 'plan-ux-review-mode',
    skill: 'plan-ux-review',
    category: 'routing',
    door_type: 'two-way',
    options: ['expand', 'polish', 'triage'],
    signal_key: 'design-care',
    description: "Design review depth: expand for competitive edge, polish every touchpoint, or triage critical gaps?",
  },
  'plan-ux-review-fix': {
    id: 'plan-ux-review-fix',
    skill: 'plan-ux-review',
    category: 'approval',
    door_type: 'two-way',
    options: ['fix-now', 'defer', 'skip'],
    signal_key: 'design-care',
    description: "Design issue flagged — fix now, defer to TODOs, or skip?",
  },

  // -----------------------------------------------------------------------
  // /plan-dx-review — developer experience plan audit
  // -----------------------------------------------------------------------
  'plan-dx-review-persona': {
    id: 'plan-dx-review-persona',
    skill: 'plan-dx-review',
    category: 'clarification',
    door_type: 'two-way',
    description: "Who is your target developer? (Determines persona for review.)",
  },
  'plan-dx-review-mode': {
    id: 'plan-dx-review-mode',
    skill: 'plan-dx-review',
    category: 'routing',
    door_type: 'two-way',
    options: ['expand', 'polish', 'triage'],
    signal_key: 'devex-care',
    description: "DX review depth: expand for competitive advantage, polish every touchpoint, or triage critical gaps?",
  },
  'plan-dx-review-friction-fix': {
    id: 'plan-dx-review-friction-fix',
    skill: 'plan-dx-review',
    category: 'approval',
    door_type: 'two-way',
    options: ['fix-now', 'defer', 'skip'],
    signal_key: 'devex-care',
    description: "Friction point in the developer journey — fix now, defer, or skip?",
  },

  // -----------------------------------------------------------------------
  // /qa-fix — QA testing
  // -----------------------------------------------------------------------
  'qa-fix-bug-fix-scope': {
    id: 'qa-fix-bug-fix-scope',
    skill: 'qa-fix',
    category: 'approval',
    door_type: 'two-way',
    options: ['fix-now', 'defer', 'skip'],
    signal_key: 'code-quality-care',
    description: "Bug found during QA — fix now, defer, or skip?",
  },
  'qa-fix-tier': {
    id: 'qa-fix-tier',
    skill: 'qa-fix',
    category: 'routing',
    door_type: 'two-way',
    options: ['quick', 'standard', 'deep'],
    description: "QA tier: quick (critical/high only), standard (+medium), or deep (+low)?",
  },

  // -----------------------------------------------------------------------
  // /debug-root-cause — root-cause debugging
  // -----------------------------------------------------------------------
  'debug-root-cause-hypothesis-confirm': {
    id: 'debug-root-cause-hypothesis-confirm',
    skill: 'debug-root-cause',
    category: 'approval',
    door_type: 'two-way',
    options: ['accept', 'reject', 'refine'],
    description: "Root-cause hypothesis — accept, reject, or refine before proceeding to fix?",
  },
  'debug-root-cause-fix-apply': {
    id: 'debug-root-cause-fix-apply',
    skill: 'debug-root-cause',
    category: 'approval',
    door_type: 'one-way',
    options: ['accept', 'reject'],
    description: "Apply the proposed fix?",
  },

  // -----------------------------------------------------------------------
  // /merge-and-deploy — merge + deploy + verify
  // -----------------------------------------------------------------------
  'merge-and-deploy-merge-confirm': {
    id: 'merge-and-deploy-merge-confirm',
    skill: 'merge-and-deploy',
    category: 'approval',
    door_type: 'one-way',
    options: ['accept', 'reject'],
    signal_key: 'decision-autonomy',
    description: "Merge this PR to base branch?",
  },
  'merge-and-deploy-rollback': {
    id: 'merge-and-deploy-rollback',
    skill: 'merge-and-deploy',
    category: 'approval',
    door_type: 'one-way',
    options: ['accept', 'reject'],
    signal_key: 'decision-autonomy',
    description: "Canary detected regressions — roll back the deploy?",
  },

  // -----------------------------------------------------------------------
  // /security-audit — security audit
  // -----------------------------------------------------------------------
  'security-audit-global-scan-approval': {
    id: 'security-audit-global-scan-approval',
    skill: 'security-audit',
    category: 'approval',
    door_type: 'one-way',
    options: ['accept', 'deny'],
    description: "Run a global security scan? (Scans files outside this branch.)",
  },
  'security-audit-finding-fix': {
    id: 'security-audit-finding-fix',
    skill: 'security-audit',
    category: 'approval',
    door_type: 'one-way',
    options: ['fix-now', 'defer', 'accept-risk'],
    description: "Security finding — fix, defer to TODOs, or accept the risk?",
  },

  // -----------------------------------------------------------------------
  // /paysec-upgrade — version upgrade
  // -----------------------------------------------------------------------
  'paysec-upgrade-inline': {
    id: 'paysec-upgrade-inline',
    skill: 'paysec-upgrade',
    category: 'approval',
    door_type: 'two-way',
    options: ['yes-upgrade', 'always-auto', 'not-now', 'never-ask'],
    description: "Upgrade paysec now? (Also: always auto-upgrade, snooze, or disable the prompt.)",
  },

  // -----------------------------------------------------------------------
  // Preamble one-time prompts (telemetry, proactive, routing)
  // -----------------------------------------------------------------------
  'preamble-telemetry-consent': {
    id: 'preamble-telemetry-consent',
    skill: 'preamble',
    category: 'approval',
    door_type: 'two-way',
    options: ['community', 'anonymous', 'off'],
    description: "Share usage data with paysec? community (recommended) / anonymous / off",
  },
  'preamble-proactive-behavior': {
    id: 'preamble-proactive-behavior',
    skill: 'preamble',
    category: 'approval',
    door_type: 'two-way',
    options: ['on', 'off'],
    description: "Let paysec proactively suggest skills based on conversation context?",
  },
  'preamble-routing-injection': {
    id: 'preamble-routing-injection',
    skill: 'preamble',
    category: 'approval',
    door_type: 'two-way',
    options: ['accept', 'decline'],
    description: "Add paysec skill routing rules to CLAUDE.md?",
  },
  'preamble-vendored-migration': {
    id: 'preamble-vendored-migration',
    skill: 'preamble',
    category: 'approval',
    door_type: 'two-way',
    options: ['accept', 'keep-vendored'],
    description: "This repo has vendored paysec (deprecated) — migrate to team mode?",
  },
  'preamble-completeness-intro': {
    id: 'preamble-completeness-intro',
    skill: 'preamble',
    category: 'approval',
    door_type: 'two-way',
    options: ['accept', 'skip'],
    description: "Open the Boil-the-Lake essay in your browser? (one-time intro)",
  },
  'preamble-cross-project-learnings': {
    id: 'preamble-cross-project-learnings',
    skill: 'preamble',
    category: 'approval',
    door_type: 'two-way',
    options: ['accept', 'reject'],
    description: "Enable cross-project learnings search? (local only, helpful for solo devs)",
  },

  // -----------------------------------------------------------------------
  // /tune-questions — the skill itself
  // -----------------------------------------------------------------------
  'tune-questions-enable-setup': {
    id: 'tune-questions-enable-setup',
    skill: 'tune-questions',
    category: 'approval',
    door_type: 'two-way',
    options: ['accept', 'skip'],
    description: "Question tuning is off — enable it and set up your profile?",
  },
  'tune-questions-declared-dimension': {
    id: 'tune-questions-declared-dimension',
    skill: 'tune-questions',
    category: 'clarification',
    door_type: 'two-way',
    description: "Self-declaration question (one per dimension during /tune-questions setup)",
  },
  'tune-questions-confirm-mutation': {
    id: 'tune-questions-confirm-mutation',
    skill: 'tune-questions',
    category: 'approval',
    door_type: 'two-way',
    options: ['accept', 'reject'],
    description: "Confirm profile change before writing (user sovereignty gate for free-form edits)",
  },

  // -----------------------------------------------------------------------
  // /auto-plan-review — sequential auto-review
  // -----------------------------------------------------------------------
  'auto-plan-review-taste-decision': {
    id: 'auto-plan-review-taste-decision',
    skill: 'auto-plan-review',
    category: 'approval',
    door_type: 'two-way',
    options: ['accept', 'override', 'investigate'],
    description: "Autoplan surfaced a taste decision at the final gate — accept, override, or investigate?",
  },
  'auto-plan-review-user-challenge': {
    id: 'auto-plan-review-user-challenge',
    skill: 'auto-plan-review',
    category: 'approval',
    door_type: 'one-way',
    options: ['accept', 'reject', 'revise'],
    description: "Both models agree your direction should change — accept, reject, or revise the plan?",
  },
} as const satisfies Record<string, QuestionDef>;

export type RegisteredQuestionId = keyof typeof QUESTIONS;

/**
 * Runtime lookup — returns undefined for ad-hoc question_ids (not registered).
 * Ad-hoc ids still log; they just don't get psychographic signal attribution.
 */
export function getQuestion(id: string): QuestionDef | undefined {
  return (QUESTIONS as Record<string, QuestionDef>)[id];
}

/** Get all registered one-way door question ids (used by sensitivity checker) */
export function getOneWayDoorIds(): Set<string> {
  return new Set(
    Object.values(QUESTIONS as Record<string, QuestionDef>)
      .filter((q) => q.door_type === 'one-way')
      .map((q) => q.id),
  );
}

/** All registered question ids, for CI completeness checks */
export function getAllRegisteredIds(): Set<string> {
  return new Set(Object.keys(QUESTIONS));
}

/** Registry stats, for /tune-questions stats */
export function getRegistryStats() {
  const all = Object.values(QUESTIONS as Record<string, QuestionDef>);
  const bySkill: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let oneWay = 0;
  let twoWay = 0;
  for (const q of all) {
    bySkill[q.skill] = (bySkill[q.skill] ?? 0) + 1;
    byCategory[q.category] = (byCategory[q.category] ?? 0) + 1;
    if (q.door_type === 'one-way') oneWay++;
    else twoWay++;
  }
  return {
    total: all.length,
    one_way: oneWay,
    two_way: twoWay,
    by_skill: bySkill,
    by_category: byCategory,
  };
}
