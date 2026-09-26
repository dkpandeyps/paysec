#!/usr/bin/env bash
# Migration: v1.68.0.0 — carry saved question preferences over to the renamed
# question ids.
#
# Why a migration: the paysec skill renames (office-hours -> idea-review,
# ship -> ship-pr, cso -> security-audit, ...) left 46 question-registry ids
# on their pre-rename prefixes. v1.68 renames them to <skill>-<slug> so the ids
# skills log line up with the registry again (door_type lookups, including 12
# one-way-door questions, key on the registry id). Preferences are keyed by
# question id in ~/.paysec/projects/<slug>/question-preferences.json, so a
# preference saved under an old id would be orphaned without this rename.
#
# What it does: for every project preference file, move each old-id key to
# its new id. If the new id already has a preference, the new one wins and the
# old key is dropped (the newer choice is the user's current intent).
# Event/log JSONL history is left untouched (append-only audit trail).
#
# Affected: installs with saved question preferences from before v1.68.0.0.
#
# Idempotent: files without old ids are left byte-identical. Non-fatal: any
# failure prints a warning and exits 0.
set -u
PAYSEC_HOME="${PAYSEC_HOME:-${HOME}/.paysec}"
[ -d "${PAYSEC_HOME}/projects" ] || exit 0
if ! command -v bun >/dev/null 2>&1; then
  echo "  [v1.68.0.0] bun not found; skipping question-id migration" >&2
  exit 0
fi

PAYSEC_HOME="${PAYSEC_HOME}" bun -e '
const fs = require("fs");
const path = require("path");
const MAP = {
  "ship-release-pipeline-missing": "ship-pr-release-pipeline-missing",
  "ship-test-failure-triage": "ship-pr-test-failure-triage",
  "ship-pre-landing-review-fix": "ship-pr-pre-landing-review-fix",
  "ship-greptile-comment-valid": "ship-pr-greptile-comment-valid",
  "ship-greptile-comment-false-positive": "ship-pr-greptile-comment-false-positive",
  "ship-todos-create": "ship-pr-todos-create",
  "ship-todos-reorganize": "ship-pr-todos-reorganize",
  "ship-changelog-voice-polish": "ship-pr-changelog-voice-polish",
  "ship-version-bump-tier": "ship-pr-version-bump-tier",
  "review-finding-fix": "pr-review-finding-fix",
  "review-sql-safety": "pr-review-sql-safety",
  "review-llm-trust-boundary": "pr-review-llm-trust-boundary",
  "office-hours-mode-goal": "idea-review-mode-goal",
  "office-hours-premise-confirm": "idea-review-premise-confirm",
  "office-hours-cross-model-run": "idea-review-cross-model-run",
  "office-hours-landscape-privacy-gate": "idea-review-landscape-privacy-gate",
  "office-hours-approach-choose": "idea-review-approach-choose",
  "office-hours-design-doc-approve": "idea-review-design-doc-approve",
  "plan-ceo-review-mode": "plan-business-review-mode",
  "plan-ceo-review-expansion-proposal": "plan-business-review-expansion-proposal",
  "plan-ceo-review-premise-revise": "plan-business-review-premise-revise",
  "plan-ceo-review-outside-voice": "plan-business-review-outside-voice",
  "plan-ceo-review-promote-to-docs": "plan-business-review-promote-to-docs",
  "plan-eng-review-arch-finding": "plan-tech-review-arch-finding",
  "plan-eng-review-scope-reduce": "plan-tech-review-scope-reduce",
  "plan-eng-review-test-gap": "plan-tech-review-test-gap",
  "plan-eng-review-outside-voice": "plan-tech-review-outside-voice",
  "plan-eng-review-todo-add": "plan-tech-review-todo-add",
  "plan-design-review-mode": "plan-ux-review-mode",
  "plan-design-review-fix": "plan-ux-review-fix",
  "plan-devex-review-persona": "plan-dx-review-persona",
  "plan-devex-review-mode": "plan-dx-review-mode",
  "plan-devex-review-friction-fix": "plan-dx-review-friction-fix",
  "qa-bug-fix-scope": "qa-fix-bug-fix-scope",
  "qa-tier": "qa-fix-tier",
  "investigate-hypothesis-confirm": "debug-root-cause-hypothesis-confirm",
  "investigate-fix-apply": "debug-root-cause-fix-apply",
  "land-and-deploy-merge-confirm": "merge-and-deploy-merge-confirm",
  "land-and-deploy-rollback": "merge-and-deploy-rollback",
  "cso-global-scan-approval": "security-audit-global-scan-approval",
  "cso-finding-fix": "security-audit-finding-fix",
  "plan-tune-enable-setup": "tune-questions-enable-setup",
  "plan-tune-declared-dimension": "tune-questions-declared-dimension",
  "plan-tune-confirm-mutation": "tune-questions-confirm-mutation",
  "autoplan-taste-decision": "auto-plan-review-taste-decision",
  "autoplan-user-challenge": "auto-plan-review-user-challenge",
};
const root = path.join(process.env.PAYSEC_HOME, "projects");
let files = 0, moved = 0;
for (const slug of fs.readdirSync(root)) {
  const file = path.join(root, slug, "question-preferences.json");
  if (!fs.existsSync(file)) continue;
  let prefs;
  try { prefs = JSON.parse(fs.readFileSync(file, "utf-8")); } catch { continue; }
  if (!prefs || typeof prefs !== "object" || Array.isArray(prefs)) continue;
  let changed = 0;
  for (const [oldId, newId] of Object.entries(MAP)) {
    if (!Object.prototype.hasOwnProperty.call(prefs, oldId)) continue;
    if (!Object.prototype.hasOwnProperty.call(prefs, newId)) prefs[newId] = prefs[oldId];
    delete prefs[oldId];
    changed++;
  }
  if (!changed) continue;
  const tmp = file + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(prefs, null, 2) + "\n", { mode: fs.statSync(file).mode });
  fs.renameSync(tmp, file);
  files++; moved += changed;
}
if (moved) console.log("  [v1.68.0.0] moved " + moved + " question preference(s) to renamed ids in " + files + " project(s)");
' || echo "  [v1.68.0.0] question-id migration failed (non-fatal)" >&2
exit 0
