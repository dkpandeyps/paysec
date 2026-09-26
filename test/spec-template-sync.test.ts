/**
 * spec-template-sync: verify write-spec/SKILL.md.tmpl ↔ write-spec/SKILL.md stay in sync.
 *
 * Per codex T8 / eng plan: regen and assert no drift. Catches commits that
 * edit the template but forget to run `bun run gen:skill-docs`, or vice versa.
 */
import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

const ROOT = path.resolve(import.meta.dir, '..');

describe('/write-spec template/generated sync', () => {
  test('regenerating write-spec/SKILL.md produces byte-identical output', () => {
    const generatedPath = path.join(ROOT, 'write-spec', 'SKILL.md');
    const before = fs.readFileSync(generatedPath);

    const res = spawnSync('bun', ['run', 'gen:skill-docs'], {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 120_000,
      // Scrubbed env: bun test runs a shard's files serially in ONE process,
      // so an earlier test's env mutations (PAYSEC_*/GBRAIN_* detection vars)
      // leak into inherited process.env and change generator output — this
      // test failed in-suite while passing solo on an identical tree. The
      // generator's output must be a function of the templates, not of
      // whichever test ran before this one.
      env: {
        PATH: process.env.PATH ?? '',
        HOME: process.env.HOME ?? '',
        TMPDIR: process.env.TMPDIR ?? '',
      },
    });
    expect(res.status).toBe(0);

    const after = fs.readFileSync(generatedPath);
    expect(after.equals(before)).toBe(true);
  }, 130_000);

  test('write-spec/SKILL.md is auto-generated header is present', () => {
    const generated = fs.readFileSync(path.join(ROOT, 'write-spec', 'SKILL.md'), 'utf-8');
    expect(generated).toMatch(/AUTO-GENERATED|do not edit directly/i);
  });
});
