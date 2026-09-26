/**
 * v1.68.0.0 migration: saved question preferences follow the renamed
 * question-registry ids (office-hours-* -> idea-review-*, ship-* -> ship-pr-*,
 * ...). Spawns the script through bash explicitly so it runs on Windows too.
 */
import { describe, test, expect } from 'bun:test';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { QUESTIONS } from '../scripts/question-registry';

const ROOT = path.resolve(import.meta.dir, '..');
const SCRIPT = path.join(ROOT, 'paysec-upgrade', 'migrations', 'v1.68.0.0.sh');

function migrationMap(): Record<string, string> {
  const src = fs.readFileSync(SCRIPT, 'utf-8');
  const body = src.slice(src.indexOf('const MAP = {'), src.indexOf('};', src.indexOf('const MAP = {')));
  return Object.fromEntries([...body.matchAll(/"([a-z0-9-]+)": "([a-z0-9-]+)"/g)].map((m) => [m[1], m[2]]));
}

function run(home: string) {
  return spawnSync('bash', [SCRIPT], { env: { ...process.env, PAYSEC_HOME: home }, encoding: 'utf-8', timeout: 30_000 });
}

function writePrefs(home: string, slug: string, prefs: Record<string, string>): string {
  const dir = path.join(home, 'projects', slug);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'question-preferences.json');
  fs.writeFileSync(file, JSON.stringify(prefs));
  return file;
}

describe('v1.68.0.0 question-id migration', () => {
  test('map targets are registered ids and sources no longer are', () => {
    const map = migrationMap();
    expect(Object.keys(map).length).toBe(46);
    for (const [oldId, newId] of Object.entries(map)) {
      expect(QUESTIONS[newId], `${newId} must be registered`).toBeDefined();
      expect(QUESTIONS[oldId], `${oldId} must be retired`).toBeUndefined();
    }
  });

  test('moves old-id preferences, keeps an existing new-id preference, leaves others alone', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-1680-'));
    try {
      const file = writePrefs(home, 'acme', {
        'office-hours-mode-goal': 'never-ask',
        'ship-version-bump-tier': 'always-ask',
        'plan-ceo-review-mode': 'never-ask',
        'plan-business-review-mode': 'always-ask',
        'custom-id': 'never-ask',
      });
      const other = writePrefs(home, 'other', { custom: 'never-ask' });
      const otherBefore = fs.readFileSync(other, 'utf-8');

      const r = run(home);
      expect(r.status).toBe(0);
      expect(JSON.parse(fs.readFileSync(file, 'utf-8'))).toEqual({
        'idea-review-mode-goal': 'never-ask',
        'ship-pr-version-bump-tier': 'always-ask',
        'plan-business-review-mode': 'always-ask', // newer choice wins
        'custom-id': 'never-ask',
      });
      expect(fs.readFileSync(other, 'utf-8')).toBe(otherBefore);

      // Idempotent: a second run leaves the file byte-identical.
      const after = fs.readFileSync(file, 'utf-8');
      expect(run(home).status).toBe(0);
      expect(fs.readFileSync(file, 'utf-8')).toBe(after);
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  test('no projects dir and malformed files are non-fatal no-ops', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-1680-'));
    try {
      expect(run(path.join(home, 'missing')).status).toBe(0);
      const dir = path.join(home, 'projects', 'bad');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'question-preferences.json'), '{not json');
      expect(run(home).status).toBe(0);
      expect(fs.readFileSync(path.join(dir, 'question-preferences.json'), 'utf-8')).toBe('{not json');
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });
});
