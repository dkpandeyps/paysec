import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const ROOT = path.resolve(import.meta.dir, '..');
const MIGRATION = path.join(ROOT, 'paysec-upgrade', 'migrations', 'v1.1.3.0.sh');

function runMigration(tmpHome: string): { exitCode: number; stdout: string; stderr: string } {
  const result = spawnSync('bash', [MIGRATION], {
    env: { ...process.env, HOME: tmpHome },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 10_000,
  });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

function setupFakePaysecRoot(tmpHome: string): string {
  // A real target that the paysec symlink can resolve into.
  const paysecDir = path.join(tmpHome, '.claude', 'skills', 'paysec');
  fs.mkdirSync(path.join(paysecDir, 'checkpoint'), { recursive: true });
  fs.writeFileSync(path.join(paysecDir, 'checkpoint', 'SKILL.md'), '# fake paysec checkpoint\n');
  return paysecDir;
}

describe('migration v1.1.3.0 — checkpoint ownership guard', () => {
  let tmpHome: string;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'paysec-migration-ownership-'));
  });

  afterEach(() => {
    try { fs.rmSync(tmpHome, { recursive: true, force: true }); } catch {}
  });

  test('scenario A: directory symlink into paysec → removed', () => {
    setupFakePaysecRoot(tmpHome);
    const skillsDir = path.join(tmpHome, '.claude', 'skills');
    const paysecCheckpoint = path.join(skillsDir, 'paysec', 'checkpoint');
    const topLevel = path.join(skillsDir, 'checkpoint');
    fs.symlinkSync(paysecCheckpoint, topLevel);

    const result = runMigration(tmpHome);
    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(topLevel)).toBe(false);
    // Also removes the paysec-owned inner copy (Shape 2 cleanup).
    expect(fs.existsSync(paysecCheckpoint)).toBe(false);
    expect(result.stdout).toContain('Removed stale /checkpoint symlink');
  });

  test('scenario B: directory with SKILL.md symlinked into paysec → removed', () => {
    setupFakePaysecRoot(tmpHome);
    const skillsDir = path.join(tmpHome, '.claude', 'skills');
    const paysecSKILL = path.join(skillsDir, 'paysec', 'checkpoint', 'SKILL.md');
    const topLevel = path.join(skillsDir, 'checkpoint');
    fs.mkdirSync(topLevel, { recursive: true });
    fs.symlinkSync(paysecSKILL, path.join(topLevel, 'SKILL.md'));

    const result = runMigration(tmpHome);
    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(topLevel)).toBe(false);
    expect(result.stdout).toContain('Removed stale /checkpoint install directory');
  });

  test('scenario C: user-owned regular directory with custom content → preserved', () => {
    setupFakePaysecRoot(tmpHome);
    const skillsDir = path.join(tmpHome, '.claude', 'skills');
    const topLevel = path.join(skillsDir, 'checkpoint');
    fs.mkdirSync(topLevel, { recursive: true });
    // User's own custom skill: regular file, not a symlink.
    fs.writeFileSync(path.join(topLevel, 'SKILL.md'), '# my custom /checkpoint\n');
    fs.writeFileSync(path.join(topLevel, 'extra.txt'), 'user content\n');

    const result = runMigration(tmpHome);
    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(topLevel)).toBe(true);
    expect(fs.existsSync(path.join(topLevel, 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(topLevel, 'extra.txt'))).toBe(true);
    expect(result.stdout).toContain('Leaving');
    expect(result.stdout).toContain('not a paysec-owned install');
  });

  test('scenario D: symlink pointing outside paysec → preserved', () => {
    setupFakePaysecRoot(tmpHome);
    const skillsDir = path.join(tmpHome, '.claude', 'skills');
    const topLevel = path.join(skillsDir, 'checkpoint');
    // User's own skill elsewhere on the filesystem.
    const userSkillDir = path.join(tmpHome, 'my-own-skill');
    fs.mkdirSync(userSkillDir, { recursive: true });
    fs.writeFileSync(path.join(userSkillDir, 'SKILL.md'), '# my custom /checkpoint\n');
    fs.symlinkSync(userSkillDir, topLevel);

    const result = runMigration(tmpHome);
    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(topLevel)).toBe(true);
    // The user's underlying dir is untouched.
    expect(fs.existsSync(path.join(userSkillDir, 'SKILL.md'))).toBe(true);
    expect(result.stdout).toContain('Leaving');
    expect(result.stdout).toContain('outside paysec');
  });

  test('scenario E: nothing to do → no-op exit 0 (idempotent)', () => {
    // No checkpoint install at all. First run: nothing removed.
    setupFakePaysecRoot(tmpHome);
    // Delete the inner paysec/checkpoint to simulate post-upgrade state.
    fs.rmSync(path.join(tmpHome, '.claude', 'skills', 'paysec', 'checkpoint'), { recursive: true, force: true });

    const result1 = runMigration(tmpHome);
    expect(result1.exitCode).toBe(0);

    // Second run: still exit 0, still no-op.
    const result2 = runMigration(tmpHome);
    expect(result2.exitCode).toBe(0);
  });

  test('scenario F: paysec not installed → no-op exit 0', () => {
    // No ~/.claude/skills/paysec/ at all. Also no checkpoint install.
    fs.mkdirSync(path.join(tmpHome, '.claude', 'skills'), { recursive: true });

    const result = runMigration(tmpHome);
    expect(result.exitCode).toBe(0);
  });

  test('scenario G: SKILL.md is a symlink pointing outside paysec → preserved', () => {
    setupFakePaysecRoot(tmpHome);
    const skillsDir = path.join(tmpHome, '.claude', 'skills');
    const topLevel = path.join(skillsDir, 'checkpoint');
    fs.mkdirSync(topLevel, { recursive: true });
    // A directory containing SKILL.md that's a symlink pointing outside paysec.
    const externalSkill = path.join(tmpHome, 'external', 'SKILL.md');
    fs.mkdirSync(path.dirname(externalSkill), { recursive: true });
    fs.writeFileSync(externalSkill, '# external skill\n');
    fs.symlinkSync(externalSkill, path.join(topLevel, 'SKILL.md'));

    const result = runMigration(tmpHome);
    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(topLevel)).toBe(true);
    expect(fs.existsSync(path.join(topLevel, 'SKILL.md'))).toBe(true);
    expect(result.stdout).toContain('Leaving');
  });
});
