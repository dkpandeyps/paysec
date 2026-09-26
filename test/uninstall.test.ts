import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const ROOT = path.resolve(import.meta.dir, '..');
const UNINSTALL = path.join(ROOT, 'bin', 'paysec-uninstall');

describe('paysec-uninstall', () => {
  test('syntax check passes', () => {
    const result = spawnSync('bash', ['-n', UNINSTALL], { stdio: 'pipe' });
    expect(result.status).toBe(0);
  });

  test('--help prints usage and exits 0', () => {
    const result = spawnSync('bash', [UNINSTALL, '--help'], { stdio: 'pipe' });
    expect(result.status).toBe(0);
    const output = result.stdout.toString();
    expect(output).toContain('paysec-uninstall');
    expect(output).toContain('--force');
    expect(output).toContain('--keep-state');
  });

  test('unknown flag exits with error', () => {
    const result = spawnSync('bash', [UNINSTALL, '--bogus'], {
      stdio: 'pipe',
      env: { ...process.env, HOME: '/nonexistent' },
    });
    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('Unknown option');
  });

  describe('integration tests with mock layout', () => {
    let tmpDir: string;
    let mockHome: string;
    let mockGitRoot: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paysec-uninstall-test-'));
      mockHome = path.join(tmpDir, 'home');
      mockGitRoot = path.join(tmpDir, 'repo');

      // Create mock paysec install layout
      fs.mkdirSync(path.join(mockHome, '.claude', 'skills', 'paysec'), { recursive: true });
      fs.writeFileSync(path.join(mockHome, '.claude', 'skills', 'paysec', 'SKILL.md'), 'test');

      // Create per-skill symlinks (both old unprefixed and new prefixed)
      fs.symlinkSync('paysec/review', path.join(mockHome, '.claude', 'skills', 'review'));
      fs.symlinkSync('paysec/ship', path.join(mockHome, '.claude', 'skills', 'paysec-ship-pr'));

      // Create a non-paysec symlink (should NOT be removed)
      fs.mkdirSync(path.join(mockHome, '.claude', 'skills', 'other-tool'), { recursive: true });

      // Create state directory
      fs.mkdirSync(path.join(mockHome, '.paysec', 'projects'), { recursive: true });
      fs.writeFileSync(path.join(mockHome, '.paysec', 'config.json'), '{}');

      // Create mock git repo
      fs.mkdirSync(mockGitRoot, { recursive: true });
      spawnSync('git', ['init', '-b', 'main'], { cwd: mockGitRoot, stdio: 'pipe' });
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('--force removes global Claude skills and state', () => {
      const result = spawnSync('bash', [UNINSTALL, '--force'], {
        stdio: 'pipe',
        env: {
          ...process.env,
          HOME: mockHome,
          PAYSEC_DIR: path.join(mockHome, '.claude', 'skills', 'paysec'),
          PAYSEC_STATE_DIR: path.join(mockHome, '.paysec'),
        },
        cwd: mockGitRoot,
      });

      expect(result.status).toBe(0);
      const output = result.stdout.toString();
      expect(output).toContain('paysec uninstalled');

      // Global skill dir should be removed
      expect(fs.existsSync(path.join(mockHome, '.claude', 'skills', 'paysec'))).toBe(false);

      // Per-skill symlinks pointing into paysec/ should be removed
      expect(fs.existsSync(path.join(mockHome, '.claude', 'skills', 'review'))).toBe(false);
      expect(fs.existsSync(path.join(mockHome, '.claude', 'skills', 'paysec-ship-pr'))).toBe(false);

      // Non-paysec tool should still exist
      expect(fs.existsSync(path.join(mockHome, '.claude', 'skills', 'other-tool'))).toBe(true);

      // State should be removed
      expect(fs.existsSync(path.join(mockHome, '.paysec'))).toBe(false);
    });

    test('--keep-state preserves state directory', () => {
      const result = spawnSync('bash', [UNINSTALL, '--force', '--keep-state'], {
        stdio: 'pipe',
        env: {
          ...process.env,
          HOME: mockHome,
          PAYSEC_DIR: path.join(mockHome, '.claude', 'skills', 'paysec'),
          PAYSEC_STATE_DIR: path.join(mockHome, '.paysec'),
        },
        cwd: mockGitRoot,
      });

      expect(result.status).toBe(0);

      // Skills should be removed
      expect(fs.existsSync(path.join(mockHome, '.claude', 'skills', 'paysec'))).toBe(false);

      // State should still exist
      expect(fs.existsSync(path.join(mockHome, '.paysec'))).toBe(true);
      expect(fs.existsSync(path.join(mockHome, '.paysec', 'config.json'))).toBe(true);
    });

    test('clean system outputs nothing to remove', () => {
      const cleanHome = path.join(tmpDir, 'clean-home');
      fs.mkdirSync(cleanHome, { recursive: true });

      const result = spawnSync('bash', [UNINSTALL, '--force'], {
        stdio: 'pipe',
        env: {
          ...process.env,
          HOME: cleanHome,
          PAYSEC_DIR: path.join(cleanHome, 'nonexistent'),
          PAYSEC_STATE_DIR: path.join(cleanHome, '.paysec'),
        },
        cwd: mockGitRoot,
      });

      expect(result.status).toBe(0);
      expect(result.stdout.toString()).toContain('Nothing to remove');
    });

    test('upgrade path: prefixed install + uninstall cleans both old and new symlinks', () => {
      // Simulate the state after setup --no-prefix followed by setup (with prefix):
      // Both old unprefixed and new prefixed symlinks exist
      // (mockHome already has both 'review' and 'paysec-ship-pr' symlinks)

      const result = spawnSync('bash', [UNINSTALL, '--force'], {
        stdio: 'pipe',
        env: {
          ...process.env,
          HOME: mockHome,
          PAYSEC_DIR: path.join(mockHome, '.claude', 'skills', 'paysec'),
          PAYSEC_STATE_DIR: path.join(mockHome, '.paysec'),
        },
        cwd: mockGitRoot,
      });

      expect(result.status).toBe(0);

      // Both old (review) and new (paysec-ship-pr) symlinks should be gone
      expect(fs.existsSync(path.join(mockHome, '.claude', 'skills', 'review'))).toBe(false);
      expect(fs.existsSync(path.join(mockHome, '.claude', 'skills', 'paysec-ship-pr'))).toBe(false);

      // Non-paysec should survive
      expect(fs.existsSync(path.join(mockHome, '.claude', 'skills', 'other-tool'))).toBe(true);
    });

    test('--force removes Cursor paysec skills and leaves other Cursor skills', () => {
      // Cursor installs are rendered real dirs, so removal is gated on the
      // generated banner in SKILL.md (S5) — the managed fixtures carry it.
      const banner = '<!-- AUTO-GENERATED from SKILL.md.tmpl - DO NOT EDIT DIRECTLY -->\n# x\n';
      fs.mkdirSync(path.join(mockHome, '.cursor', 'skills', 'paysec'), { recursive: true });
      fs.writeFileSync(path.join(mockHome, '.cursor', 'skills', 'paysec', 'SKILL.md'), banner);
      fs.mkdirSync(path.join(mockHome, '.cursor', 'skills', 'paysec-pr-review'), { recursive: true });
      fs.writeFileSync(path.join(mockHome, '.cursor', 'skills', 'paysec-pr-review', 'SKILL.md'), banner);
      fs.mkdirSync(path.join(mockHome, '.cursor', 'skills', 'frontend-design'), { recursive: true });
      fs.writeFileSync(path.join(mockHome, '.cursor', 'skills', 'frontend-design', 'SKILL.md'), 'keep');

      fs.mkdirSync(path.join(mockGitRoot, '.cursor', 'skills', 'paysec-ship-pr'), { recursive: true });
      fs.writeFileSync(path.join(mockGitRoot, '.cursor', 'skills', 'paysec-ship-pr', 'SKILL.md'), banner);
      fs.mkdirSync(path.join(mockGitRoot, '.cursor', 'rules'), { recursive: true });
      fs.writeFileSync(path.join(mockGitRoot, '.cursor', 'rules', 'keep.md'), 'keep');

      const result = spawnSync('bash', [UNINSTALL, '--force'], {
        stdio: 'pipe',
        env: {
          ...process.env,
          HOME: mockHome,
          PAYSEC_DIR: path.join(mockHome, '.claude', 'skills', 'paysec'),
          PAYSEC_STATE_DIR: path.join(mockHome, '.paysec'),
        },
        cwd: mockGitRoot,
      });

      expect(result.status).toBe(0);

      expect(fs.existsSync(path.join(mockHome, '.cursor', 'skills', 'paysec'))).toBe(false);
      expect(fs.existsSync(path.join(mockHome, '.cursor', 'skills', 'paysec-pr-review'))).toBe(false);
      expect(fs.existsSync(path.join(mockHome, '.cursor', 'skills', 'frontend-design'))).toBe(true);
      expect(fs.existsSync(path.join(mockGitRoot, '.cursor', 'skills', 'paysec-ship-pr'))).toBe(false);
      expect(fs.existsSync(path.join(mockGitRoot, '.cursor', 'rules', 'keep.md'))).toBe(true);
    });

    test("a user's own paysec-prefixed Cursor dir (no banner) survives and is listed", () => {
      // S5: the bare paysec* glob must not sweep a dir that merely starts
      // with "paysec" — provenance comes from the generated banner, and a
      // hand-written SKILL.md never carries it.
      const foreign = path.join(mockHome, '.cursor', 'skills', 'paysec-fork-notes');
      fs.mkdirSync(foreign, { recursive: true });
      fs.writeFileSync(path.join(foreign, 'SKILL.md'), '# my own notes\n');

      const foreignLocal = path.join(mockGitRoot, '.cursor', 'skills', 'paysec-my-rules');
      fs.mkdirSync(foreignLocal, { recursive: true });
      fs.writeFileSync(path.join(foreignLocal, 'SKILL.md'), '# hand-written\n');

      const result = spawnSync('bash', [UNINSTALL, '--force'], {
        stdio: 'pipe',
        env: {
          ...process.env,
          HOME: mockHome,
          PAYSEC_DIR: path.join(mockHome, '.claude', 'skills', 'paysec'),
          PAYSEC_STATE_DIR: path.join(mockHome, '.paysec'),
        },
        cwd: mockGitRoot,
      });

      expect(result.status).toBe(0);
      expect(fs.existsSync(foreign)).toBe(true);
      expect(fs.existsSync(foreignLocal)).toBe(true);
      const stderr = result.stderr.toString();
      expect(stderr).toContain('left in place');
      expect(stderr).toContain('paysec-fork-notes');
      expect(stderr).toContain('paysec-my-rules');
    });
  });
});
