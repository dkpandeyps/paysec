/**
 * AUTO_DECIDE opt-in preserved under Conductor flags (periodic-tier, paid, real-PTY).
 *
 * Regression test for v1.21+ fix: the new "Tool resolution" preamble
 * (scripts/resolvers/preamble/generate-ask-user-format.ts) tells the model
 * to prefer mcp__*__AskUserQuestion variants and fall back to plan-file
 * decisions when neither is callable. This must NOT break the legitimate
 * `/tune-questions` AUTO_DECIDE path: when the user has explicitly opted into
 * auto-deciding a specific question via `paysec-question-preference --write
 * never-ask`, the model is supposed to honor that — it should still
 * auto-pick the recommended option and emit the AUTO_DECIDE annotation
 * ("Auto-decided <summary> → <option> (your preference). Change with
 * /tune-questions.") instead of opening a question prompt.
 *
 * Periodic tier: AUTO_DECIDE behavior depends on the model adhering to
 * the QUESTION_TUNING preamble injection. Non-deterministic; runs weekly
 * or manually rather than gating CI.
 *
 * Set up:
 *   - tmpDir as PAYSEC_HOME (isolated state, doesn't touch the user's
 *     real ~/.paysec)
 *   - question_tuning=true in the tmp config
 *   - preference for plan-business-review-mode → never-ask (source: tune-questions)
 *
 * Spawn:
 *   claude --permission-mode plan --disallowedTools AskUserQuestion
 *   /plan-business-review
 *
 * Expected:
 *   - outcome === 'auto_decided' (the AUTO_DECIDE preamble fired and the
 *     "Auto-decided ... (your preference)" text rendered)
 *
 * If outcome is 'asked', the model ignored the user's `/tune-questions`
 * preference — that's a regression against the opt-in feature. If outcome
 * is 'plan_ready' with no AUTO_DECIDE text, the model auto-decided BUT
 * skipped the annotation (acceptable; AUTO_DECIDE annotation is good
 * practice but not the load-bearing behavior).
 */

import { test, expect } from 'bun:test';
import { describeE2ETier } from './helpers/e2e-gate';
import { runPlanSkillObservation } from './helpers/claude-pty-runner';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';

const describeE2E = describeE2ETier('periodic');

const ROOT = path.resolve(import.meta.dir, '..');

describeE2E('AUTO_DECIDE opt-in preserved under Conductor flags (periodic)', () => {
  test('user-opted-in question still auto-decides when AskUserQuestion is --disallowedTools', async () => {
    const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'paysec-auto-decide-'));
    try {
      // 1. Bootstrap the tmp PAYSEC_HOME with question_tuning=true.
      const configBin = path.join(ROOT, 'bin', 'paysec-config');
      const setRes = spawnSync(configBin, ['set', 'question_tuning', 'true'], {
        env: { ...process.env, PAYSEC_HOME: tmpHome },
        encoding: 'utf-8',
      });
      if (setRes.status !== 0) {
        throw new Error(`paysec-config set failed: ${setRes.stderr || setRes.stdout}`);
      }

      // 2. Resolve slug for the project (uses git remote — same as the spawned
      //    claude would resolve). The preference file path keys on this slug.
      const slugBin = path.join(ROOT, 'bin', 'paysec-slug');
      const slugRes = spawnSync(slugBin, [], {
        cwd: ROOT,
        env: { ...process.env, PAYSEC_HOME: tmpHome },
        encoding: 'utf-8',
      });
      // paysec-slug emits `eval`-able shell exports like `SLUG=garrytan-paysec`.
      const slug = (slugRes.stdout.match(/SLUG=([^\s;]+)/)?.[1] ?? 'unknown').replace(/['"]/g, '');

      // 3. Write the preference: plan-business-review-mode → never-ask. The
      //    'tune-questions' source bypasses the inline-user origin gate.
      const prefBin = path.join(ROOT, 'bin', 'paysec-question-preference');
      const writeRes = spawnSync(
        prefBin,
        ['--write', JSON.stringify({
          question_id: 'plan-business-review-mode',
          preference: 'never-ask',
          source: 'tune-questions',
        })],
        {
          env: { ...process.env, PAYSEC_HOME: tmpHome },
          encoding: 'utf-8',
        },
      );
      if (writeRes.status !== 0) {
        throw new Error(`paysec-question-preference --write failed: ${writeRes.stderr || writeRes.stdout}`);
      }

      // Sanity: the preference file landed where we expect.
      const prefFile = path.join(tmpHome, 'projects', slug, 'question-preferences.json');
      if (!fs.existsSync(prefFile)) {
        throw new Error(`expected preference file at ${prefFile}; not found. slug=${slug}`);
      }

      // 4. Run /plan-business-review with the Conductor flag set + isolated state.
      //    PAYSEC_HOME=tmpHome is REQUIRED: the preference + question_tuning were
      //    seeded there. Without it the spawned claude reads the real ~/.paysec,
      //    never sees the never-ask preference, and the test silently exercises
      //    the wrong state root (pre-existing bug, Codex #9 / Issue 13).
      //    CONDUCTOR_WORKSPACE_PATH additionally proves auto-decide still WINS
      //    over the Conductor prose redirect (precedence: settled preference
      //    beats transport-avoidance).
      const obs = await runPlanSkillObservation({
        skillName: 'plan-business-review',
        inPlanMode: true,
        extraArgs: ['--disallowedTools', 'AskUserQuestion'],
        timeoutMs: 540_000,
        env: { PAYSEC_HOME: tmpHome, CONDUCTOR_WORKSPACE_PATH: tmpHome },
      });

      // 5. Pass: 'auto_decided' (the strongest signal) or 'plan_ready' with
      //    no question rendered. Fail: 'asked' (model ignored the opt-in).
      if (obs.outcome === 'asked') {
        throw new Error(
          `AUTO_DECIDE regression: the model surfaced an AskUserQuestion despite the user's never-ask preference.\n` +
            `summary: ${obs.summary}\n` +
            `--- evidence (last 2KB visible) ---\n${obs.evidence}`,
        );
      }
      if (obs.outcome === 'silent_write' || obs.outcome === 'exited' || obs.outcome === 'timeout') {
        throw new Error(
          `AUTO_DECIDE preserve test inconclusive: outcome=${obs.outcome}\n` +
            `summary: ${obs.summary}\n` +
            `--- evidence (last 2KB visible) ---\n${obs.evidence}`,
        );
      }
      expect(['auto_decided', 'plan_ready']).toContain(obs.outcome);
    } finally {
      try { fs.rmSync(tmpHome, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
  }, 660_000);
});
