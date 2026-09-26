/**
 * Writing Style preamble section — gate-tier assertions on generated prose.
 *
 * These tests assert the V1 Writing Style section is properly composed into
 * tier-≥2 preamble output, in both Claude and Codex host outputs. Since the
 * block itself is prose the agent obeys at runtime, we can't test the agent's
 * compliance here — that's the periodic LLM-judge E2E test (to-be-added).
 *
 * What this test enforces:
 * - Writing Style section header present in tier-≥2 generated preamble
 * - Compact semantic contract present (gloss, outcome, impact, override)
 * - Jargon list inlined (sample terms appear)
 * - Terse-mode gate condition text present
 * - Codex output uses $PAYSEC_BIN, not ~/.claude/... (host-aware paths)
 * - Tier-1 preamble does NOT include Writing Style section
 */
import { describe, test, expect } from 'bun:test';
import type { TemplateContext } from '../scripts/resolvers/types';
import { HOST_PATHS } from '../scripts/resolvers/types';
import { generatePreamble } from '../scripts/resolvers/preamble';
import * as fs from 'fs';
import * as path from 'path';

// The skill-start probe bash lives in bin/paysec-preamble; the rendered
// preamble carries a one-line call to it.
const PREAMBLE_SCRIPT = fs.readFileSync(path.join(import.meta.dir, '..', 'bin', 'paysec-preamble'), 'utf-8');

function makeCtx(host: 'claude' | 'codex', tier: 1 | 2 | 3 | 4): TemplateContext {
  return {
    skillName: 'test-skill',
    tmplPath: 'test.tmpl',
    host,
    paths: HOST_PATHS[host],
    preambleTier: tier,
  };
}

describe('Writing Style preamble section', () => {
  test('tier 2+ Claude preamble includes Writing Style header', () => {
    const out = generatePreamble(makeCtx('claude', 2));
    expect(out).toContain('## Writing Style');
  });

  test('tier 2+ preamble includes EXPLAIN_LEVEL echo in bash', () => {
    const out = generatePreamble(makeCtx('claude', 2));
    expect(out).toContain('"$_PAYSEC_PREAMBLE" --skill ');
    expect(PREAMBLE_SCRIPT).toContain('_EXPLAIN_LEVEL');
    expect(PREAMBLE_SCRIPT).toContain('EXPLAIN_LEVEL:');
  });

  test('tier 2+ preamble includes the compact writing-style contract', () => {
    const out = generatePreamble(makeCtx('claude', 2));
    expect(out).toMatch(/gloss.*first use|first-use.*gloss/i);
    expect(out).toMatch(/outcome/i);
    expect(out).toMatch(/user impact|user.*experience|what.*user.*sees/i);
    expect(out).toMatch(/terse|no explanations|user-turn override|current message/i);
  });

  test('tier 2+ preamble references jargon list by path (v1.45.0.0 T3 — pointer, not inline)', () => {
    const out = generatePreamble(makeCtx('claude', 2));
    // T3 dedup: the 80-term jargon list lives in scripts/jargon-list.json.
    // The Writing Style section points at the file rather than inlining it,
    // saving ~70 KB across the corpus. Agents Read the JSON on first
    // jargon term encountered per session.
    expect(out).toContain('jargon-list.json');
    expect(out).toContain('Curated jargon list');
    // Negative check: the literal term lines should NOT be inlined any more.
    expect(out).not.toMatch(/^- idempotent$/m);
    expect(out).not.toMatch(/^- race condition$/m);
  });

  test('tier 2+ preamble includes terse-mode gate condition', () => {
    const out = generatePreamble(makeCtx('claude', 2));
    expect(out).toContain('EXPLAIN_LEVEL: terse');
    expect(out).toMatch(/skip.*terse|Terse mode.*skip/is);
  });

  test('Codex tier-2 preamble uses host-aware path (no .claude/)', () => {
    const out = generatePreamble(makeCtx('codex', 2));
    // The Codex preamble must reach the probe through $PAYSEC_BIN, never a
    // Claude-specific bin path.
    const callLine = out.split('\n').find(l => l.startsWith('_PAYSEC_PREAMBLE='));
    expect(callLine).toBeDefined();
    expect(callLine).not.toMatch(/\.claude\//);
    expect(callLine).toContain('$PAYSEC_BIN');
    // The probe resolves its helpers from its own directory (host-agnostic).
    const explainLine = PREAMBLE_SCRIPT.split('\n').find(l => l.includes('_EXPLAIN_LEVEL='));
    expect(explainLine).toBeDefined();
    expect(explainLine).not.toMatch(/\.claude\//);
    expect(explainLine).toContain('$SCRIPT_DIR');
  });

  test('tier 1 preamble does NOT include Writing Style section', () => {
    const out = generatePreamble(makeCtx('claude', 1));
    expect(out).not.toContain('## Writing Style');
  });

  test('tier 2+ preamble composition note references AskUserQuestion Format', () => {
    const out = generatePreamble(makeCtx('claude', 2));
    // The Writing Style section should explicitly compose with the existing Format section
    expect(out).toContain('AskUserQuestion Format');
  });

  test('tier 2+ preamble migration-prompt block appears', () => {
    const out = generatePreamble(makeCtx('claude', 2));
    // On Claude the one-time prompt is a gate pointer to its on-demand file.
    expect(out).toContain('If `WRITING_STYLE_PENDING` is `yes`: Read `~/.claude/skills/paysec/preamble/sections/writing-style-migration.md`');
    const file = fs.readFileSync(path.join(import.meta.dir, '..', 'preamble', 'sections', 'writing-style-migration.md'), 'utf-8');
    expect(file).toContain('WRITING_STYLE_PENDING');
    expect(file).toMatch(/writing-style-prompt-pending/);
  });
});
