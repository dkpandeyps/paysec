/**
 * bin/paysec-test-register — record test cases, import JUnit, build the Test Case Register.
 * Also guards that the 8 testing skills carry the {{TEST_CASE_REGISTER}} block.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');
const BIN = path.join(ROOT, 'bin', 'paysec-test-register');
let work: string;
let run: string;

function reg(...args: string[]) {
  const r = spawnSync('bun', [BIN, ...args], { cwd: work, encoding: 'utf-8', env: { ...process.env, PAYSEC_REGISTER_NO_PDF: '1' } });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

beforeAll(() => {
  work = fs.mkdtempSync(path.join(os.tmpdir(), 'paysec-register-'));
  const r = reg('start', 'qa-report', 'https://staging.example.com');
  expect(r.code).toBe(0);
  run = r.out.trim().split('\n').pop()!.trim();
});
afterAll(() => {
  // Windows can briefly hold the temp dir open after child processes exit; retry, never fail the suite on cleanup.
  try { fs.rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* best effort */ }
});

describe('paysec-test-register', () => {
  test('start creates a run directory with meta.json under .paysec/test-registers', () => {
    expect(run).toContain('.paysec/test-registers/qa-report-');
    expect(fs.existsSync(path.join(run, 'meta.json'))).toBe(true);
  });

  test('add records passing and failing cases, and masks password inputs', () => {
    expect(reg('add', run, JSON.stringify({ id: 'QA-001', module: 'Login', target: 'password field', input: 'Hunter2!Secret', expected: 'login ok', actual: 'ok', result: 'pass' })).code).toBe(0);
    expect(reg('add', run, JSON.stringify([{ id: 'QA-002', module: 'Banks', title: 'empty search', expected: 'empty state', actual: 'blank', result: 'fail', severity: 'medium' }])).code).toBe(0);
    const lines = fs.readFileSync(path.join(run, 'test-cases.jsonl'), 'utf-8').trim().split('\n').map(l => JSON.parse(l));
    expect(lines.map(l => l.result)).toEqual(['PASS', 'FAIL']);
    expect(lines[0].input).toBe('[REDACTED]');
  });

  test('secrets inside free text are redacted', () => {
    reg('add', run, JSON.stringify({ id: 'QA-003', title: 'key leak', actual: 'saw sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH', result: 'fail' }));
    expect(fs.readFileSync(path.join(run, 'test-cases.jsonl'), 'utf-8')).not.toContain('sk-ant-api03-abcdefghijklmnop');
  });

  test('import-junit imports every testcase with pass/fail/skip', () => {
    const xml = path.join(work, 'junit.xml');
    fs.writeFileSync(xml, '<testsuites><testsuite><testcase classname="a" name="ok"/><testcase classname="a" name="bad"><failure message="boom"/></testcase><testcase classname="a" name="later"><skipped/></testcase></testsuite></testsuites>');
    const r = reg('import-junit', run, xml, 'Unit tests');
    expect(r.out).toContain('imported 3 test cases');
  });

  test('build writes a register listing every case, failures first', () => {
    const r = reg('build', run);
    expect(r.code).toBe(0);
    expect(r.out).toContain('REGISTER_TOTALS: 6 test cases | pass 2 | fail 3 | skipped 1');
    const md = fs.readFileSync(path.join(run, 'test-case-register.md'), 'utf-8');
    expect(md).toContain('## Failed and blocked test cases (3)');
    expect(md).toContain('## All test cases (6)');
    for (const id of ['QA-001', 'QA-002', 'QA-003', 'a › ok', 'a › bad', 'a › later']) expect(md).toContain(id);
    expect(md).not.toContain('Hunter2!Secret');
  });

  test('rejects a directory that is not a register run', () => {
    expect(reg('add', work, '{}').code).not.toBe(0);
  });
});

describe('testing skills carry the Test Case Register block', () => {
  const SKILLS: Record<string, string> = {
    'qa-report': 'web', 'qa-fix': 'web', 'design-qa': 'web', 'perf-check': 'web',
    'post-deploy-monitor': 'web', 'dx-audit': 'web', 'ship-pr': 'code', 'pr-review': 'review',
  };
  for (const [skill, mode] of Object.entries(SKILLS)) {
    test(`${skill} template uses {{TEST_CASE_REGISTER:${mode}}} and the generated SKILL.md contains it`, () => {
      // carved skills keep the block in an on-demand section (ship-pr: sections/tests)
      const tmpl = skill === 'ship-pr' ? path.join(ROOT, skill, 'sections', 'tests.md.tmpl') : path.join(ROOT, skill, 'SKILL.md.tmpl');
      const gen = skill === 'ship-pr' ? path.join(ROOT, skill, 'sections', 'tests.md') : path.join(ROOT, skill, 'SKILL.md');
      expect(fs.readFileSync(tmpl, 'utf-8')).toContain(`{{TEST_CASE_REGISTER:${mode}}}`);
      const md = fs.readFileSync(gen, 'utf-8');
      expect(md).toContain('## Test Case Register (required for every run)');
      expect(md).toContain(`paysec-test-register start ${skill}`);
    });
  }
});
