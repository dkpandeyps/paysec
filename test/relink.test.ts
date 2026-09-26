import { describe, test as _bunTest, expect, beforeEach, afterEach } from 'bun:test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Every test in this file shells out to paysec-config + paysec-relink (bash scripts
// invoking subprocess work). Under parallel bun test load, subprocess spawn contends
// with other suites and each test can drift ~200ms past the 5s default. Bump to 15s.
// Object.assign preserves test.only / test.skip / test.each / test.todo sub-APIs.
const test = Object.assign(
  ((name: any, fn: any, timeout?: number) =>
    _bunTest(name, fn, timeout ?? 15_000)) as typeof _bunTest,
  _bunTest,
);

const ROOT = path.resolve(import.meta.dir, '..');
const BIN = path.join(ROOT, 'bin');

let tmpDir: string;
let skillsDir: string;
let installDir: string;

function run(cmd: string, env: Record<string, string> = {}, expectFail = false): string {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      // A sibling test file in the same shard PROCESS can leave PAYSEC_HOME
      // set on process.env; relink/config children must resolve state ONLY
      // via the dirs this test passes (observed: 'fresh install' test saw a
      // neighbor's skill_prefix and produced prefixed names).
      env: (() => {
        const child: Record<string, string | undefined> = { ...process.env, PAYSEC_STATE_DIR: tmpDir, ...env };
        if (!('PAYSEC_HOME' in env)) delete child.PAYSEC_HOME;
        return child;
      })(),
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (e: any) {
    if (expectFail) return (e.stderr || e.stdout || '').toString().trim();
    throw e;
  }
}

// Create a mock paysec install directory with skill subdirs
function setupMockInstall(skills: string[]): void {
  installDir = path.join(tmpDir, 'paysec-install');
  skillsDir = path.join(tmpDir, 'skills');
  fs.mkdirSync(installDir, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });

  // Copy the real paysec-config and paysec-relink to the mock install
  const mockBin = path.join(installDir, 'bin');
  fs.mkdirSync(mockBin, { recursive: true });
  fs.copyFileSync(path.join(BIN, 'paysec-config'), path.join(mockBin, 'paysec-config'));
  fs.chmodSync(path.join(mockBin, 'paysec-config'), 0o755);
  if (fs.existsSync(path.join(BIN, 'paysec-relink'))) {
    fs.copyFileSync(path.join(BIN, 'paysec-relink'), path.join(mockBin, 'paysec-relink'));
    fs.chmodSync(path.join(mockBin, 'paysec-relink'), 0o755);
  }
  if (fs.existsSync(path.join(BIN, 'paysec-patch-names'))) {
    fs.copyFileSync(path.join(BIN, 'paysec-patch-names'), path.join(mockBin, 'paysec-patch-names'));
    fs.chmodSync(path.join(mockBin, 'paysec-patch-names'), 0o755);
  }

  // Create mock skill directories with proper frontmatter
  for (const skill of skills) {
    fs.mkdirSync(path.join(installDir, skill), { recursive: true });
    fs.writeFileSync(
      path.join(installDir, skill, 'SKILL.md'),
      `---\nname: ${skill}\ndescription: test\n---\n# ${skill}`
    );
  }
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paysec-relink-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('paysec-relink (#578)', () => {
  // Test 11: prefixed symlinks when skill_prefix=true
  test('creates paysec-* symlinks when skill_prefix=true', () => {
    setupMockInstall(['qa', 'ship', 'review']);
    // Set config to prefix mode (pass install/skills env so auto-relink uses mock install)
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix true`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    // Run relink with env pointing to the mock install
    const output = run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    // Verify paysec-* symlinks exist
    expect(fs.existsSync(path.join(skillsDir, 'paysec-qa-fix'))).toBe(true);
    expect(fs.existsSync(path.join(skillsDir, 'paysec-ship-pr'))).toBe(true);
    expect(fs.existsSync(path.join(skillsDir, 'paysec-pr-review'))).toBe(true);
    expect(output).toContain('paysec-');
  });

  // Test 12: flat symlinks when skill_prefix=false
  test('creates flat symlinks when skill_prefix=false', () => {
    setupMockInstall(['qa', 'ship', 'review']);
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix false`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    const output = run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    expect(fs.existsSync(path.join(skillsDir, 'qa'))).toBe(true);
    expect(fs.existsSync(path.join(skillsDir, 'ship'))).toBe(true);
    expect(fs.existsSync(path.join(skillsDir, 'review'))).toBe(true);
    expect(output).toContain('flat');
  });

  // REGRESSION: unprefixed skills must be real directories, not symlinks (#761)
  // Claude Code auto-prefixes skills nested under a parent dir symlink.
  // e.g., `qa -> paysec/qa` gets discovered as "paysec-qa-fix", not "qa".
  // The fix: create real directories with SKILL.md symlinks inside.
  test('unprefixed skills are real directories with SKILL.md symlinks, not dir symlinks', () => {
    setupMockInstall(['qa', 'ship', 'review', 'plan-business-review']);
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix false`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    for (const skill of ['qa', 'ship', 'review', 'plan-business-review']) {
      const skillPath = path.join(skillsDir, skill);
      const skillMdPath = path.join(skillPath, 'SKILL.md');
      // Must be a real directory, NOT a symlink
      expect(fs.lstatSync(skillPath).isDirectory()).toBe(true);
      expect(fs.lstatSync(skillPath).isSymbolicLink()).toBe(false);
      // Must contain a SKILL.md that IS a symlink
      expect(fs.existsSync(skillMdPath)).toBe(true);
      expect(fs.lstatSync(skillMdPath).isSymbolicLink()).toBe(true);
      // The SKILL.md symlink must point to the source skill's SKILL.md
      const target = fs.readlinkSync(skillMdPath);
      expect(target).toContain(skill);
      expect(target).toEndWith('/SKILL.md');
    }
  });

  // Same invariant for prefixed mode
  test('prefixed skills are real directories with SKILL.md symlinks, not dir symlinks', () => {
    setupMockInstall(['qa', 'ship']);
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix true`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    for (const skill of ['paysec-qa-fix', 'paysec-ship-pr']) {
      const skillPath = path.join(skillsDir, skill);
      const skillMdPath = path.join(skillPath, 'SKILL.md');
      expect(fs.lstatSync(skillPath).isDirectory()).toBe(true);
      expect(fs.lstatSync(skillPath).isSymbolicLink()).toBe(false);
      expect(fs.lstatSync(skillMdPath).isSymbolicLink()).toBe(true);
    }
  });

  // Upgrade: old directory symlinks get replaced with real directories
  test('upgrades old directory symlinks to real directories', () => {
    setupMockInstall(['qa', 'ship']);
    // Simulate old behavior: create directory symlinks (the old pattern)
    fs.symlinkSync(path.join(installDir, 'qa'), path.join(skillsDir, 'qa'));
    fs.symlinkSync(path.join(installDir, 'ship'), path.join(skillsDir, 'ship'));
    // Verify they start as symlinks
    expect(fs.lstatSync(path.join(skillsDir, 'qa')).isSymbolicLink()).toBe(true);

    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix false`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });

    // After relink: must be real directories, not symlinks
    expect(fs.lstatSync(path.join(skillsDir, 'qa')).isSymbolicLink()).toBe(false);
    expect(fs.lstatSync(path.join(skillsDir, 'qa')).isDirectory()).toBe(true);
    expect(fs.lstatSync(path.join(skillsDir, 'qa-fix', 'SKILL.md')).isSymbolicLink()).toBe(true);
  });

  test('creates a thin root alias wrapper for the /paysec slash command', () => {
    setupMockInstall(['qa']);
    fs.writeFileSync(
      path.join(installDir, 'SKILL.md'),
      '---\nname: paysec\ndescription: root\n---\n# paysec',
    );

    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix false`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });

    const aliasDir = path.join(skillsDir, '_paysec-command');
    const aliasSkill = path.join(aliasDir, 'SKILL.md');
    expect(fs.lstatSync(aliasDir).isDirectory()).toBe(true);
    expect(fs.lstatSync(aliasDir).isSymbolicLink()).toBe(false);
    // #2511: the alias is a rewritten COPY, never a symlink. A symlinked
    // alias re-serves the canonical `name: paysec`; Claude Code refuses
    // duplicate skill names and drops the entire personal-skills set.
    expect(fs.lstatSync(aliasSkill).isSymbolicLink()).toBe(false);
    const aliasContent = fs.readFileSync(aliasSkill, 'utf-8');
    expect(aliasContent).toContain('name: _paysec-command');
    expect(aliasContent).not.toContain('name: paysec\n');
    // The rewrite happened on the COPY: the canonical source keeps its name.
    expect(fs.readFileSync(path.join(installDir, 'SKILL.md'), 'utf-8')).toContain('name: paysec');

    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix true`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    expect(fs.existsSync(aliasSkill)).toBe(true);
  });

  // #2201: connect-chrome ships as a dir SYMLINK to open-paysec-browser. The
  // discovery loop used to link it under its own basename while its SKILL.md
  // carried `name: open-paysec-browser` — a duplicate name that silently
  // shadows the real skill (readdir-order roulette). Symlinked source dirs
  // must be skipped; setup owns the rewritten-copy alias.
  test('symlinked skill dirs are skipped, so no duplicate frontmatter names (#2201)', () => {
    setupMockInstall(['open-paysec-browser', 'qa']);
    fs.symlinkSync(
      path.join(installDir, 'open-paysec-browser'),
      path.join(installDir, 'connect-chrome'),
    );
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix false`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });

    expect(fs.existsSync(path.join(skillsDir, 'open-paysec-browser'))).toBe(true);
    expect(fs.existsSync(path.join(skillsDir, 'connect-chrome'))).toBe(false);

    // No two installed SKILL.md files may share a frontmatter name.
    const names: string[] = [];
    for (const entry of fs.readdirSync(skillsDir)) {
      const skillMd = path.join(skillsDir, entry, 'SKILL.md');
      if (!fs.existsSync(skillMd)) continue;
      const m = fs.readFileSync(skillMd, 'utf-8').match(/^name:\s*(\S+)/m);
      if (m) names.push(m[1]);
    }
    expect(new Set(names).size).toBe(names.length);
  });

  // #2569: rendered :user variants live in ${PAYSEC_HOME}/render/claude.
  // relink must serve the render when present — otherwise any config change
  // silently flips every skill back to the canonical (blockless) source.
  test('prefers a rendered SKILL.md from PAYSEC_HOME/render/claude (#2569)', () => {
    setupMockInstall(['qa', 'ship']);
    const renderDir = path.join(tmpDir, 'render', 'claude', 'qa');
    fs.mkdirSync(renderDir, { recursive: true });
    fs.writeFileSync(
      path.join(renderDir, 'SKILL.md'),
      '---\nname: qa\ndescription: test\n---\nrendered brain-aware qa',
    );

    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix false`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
      PAYSEC_HOME: tmpDir,
    });
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
      PAYSEC_HOME: tmpDir,
    });

    const qaLink = path.join(skillsDir, 'qa-fix', 'SKILL.md');
    expect(fs.readlinkSync(qaLink)).toBe(path.join(renderDir, 'SKILL.md'));
    expect(fs.readFileSync(qaLink, 'utf-8')).toContain('rendered brain-aware qa');
    // ship has no render — canonical source link.
    expect(fs.readlinkSync(path.join(skillsDir, 'ship-pr', 'SKILL.md'))).toBe(
      path.join(installDir, 'ship-pr', 'SKILL.md'),
    );
  });

  // FIRST INSTALL: --no-prefix must create ONLY flat names, zero paysec-* pollution
  test('first install --no-prefix: only flat names exist, zero paysec-* entries', () => {
    setupMockInstall(['qa', 'ship', 'review', 'plan-business-review', 'paysec-upgrade']);
    // Simulate first install: no saved config, pass --no-prefix equivalent
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix false`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    // Enumerate everything in skills dir
    const entries = fs.readdirSync(skillsDir);
    // Expected: qa, ship, review, plan-business-review, paysec-upgrade (its real name)
    expect(entries.sort()).toEqual(['paysec-upgrade', 'plan-business-review', 'qa', 'review', 'ship']);
    // No paysec-qa-fix, paysec-ship-pr, paysec-pr-review, paysec-plan-business-review
    const leaked = entries.filter(e => e.startsWith('paysec-') && e !== 'paysec-upgrade');
    expect(leaked).toEqual([]);
  });

  // FIRST INSTALL: --prefix must create ONLY paysec-* names, zero flat-name pollution
  test('first install --prefix: only paysec-* entries exist, zero flat names', () => {
    setupMockInstall(['qa', 'ship', 'review', 'plan-business-review', 'paysec-upgrade']);
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix true`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    const entries = fs.readdirSync(skillsDir);
    // Expected: paysec-qa-fix, paysec-ship-pr, paysec-pr-review, paysec-plan-business-review, paysec-upgrade
    expect(entries.sort()).toEqual([
      'paysec-plan-business-review', 'paysec-qa-fix', 'paysec-pr-review', 'paysec-ship-pr', 'paysec-upgrade',
    ]);
    // No unprefixed qa, ship, review, plan-business-review
    const leaked = entries.filter(e => !e.startsWith('paysec-'));
    expect(leaked).toEqual([]);
  });

  // FIRST INSTALL: non-TTY (no saved config, piped stdin) defaults to flat names
  test('non-TTY first install defaults to flat names via relink', () => {
    setupMockInstall(['qa', 'ship']);
    // Don't set any config — simulate fresh install
    // paysec-relink reads config; on fresh install config returns empty → defaults to false
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    const entries = fs.readdirSync(skillsDir);
    // Should be flat names (relink defaults to false when config returns empty)
    expect(entries.sort()).toEqual(['qa', 'ship']);
  });

  // SWITCH: prefix → no-prefix must clean up ALL paysec-* entries
  test('switching prefix to no-prefix removes all paysec-* entries completely', () => {
    setupMockInstall(['qa', 'ship', 'review', 'plan-business-review', 'paysec-upgrade']);
    // Start in prefix mode
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix true`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    let entries = fs.readdirSync(skillsDir);
    expect(entries.filter(e => !e.startsWith('paysec-'))).toEqual([]);

    // Switch to no-prefix
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix false`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    entries = fs.readdirSync(skillsDir);
    // Only flat names + paysec-upgrade (its real name)
    expect(entries.sort()).toEqual(['paysec-upgrade', 'plan-business-review', 'qa', 'review', 'ship']);
    const leaked = entries.filter(e => e.startsWith('paysec-') && e !== 'paysec-upgrade');
    expect(leaked).toEqual([]);
  });

  // SWITCH: no-prefix → prefix must clean up ALL flat entries
  test('switching no-prefix to prefix removes all flat entries completely', () => {
    setupMockInstall(['qa', 'ship', 'review', 'paysec-upgrade']);
    // Start in no-prefix mode
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix false`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    let entries = fs.readdirSync(skillsDir);
    expect(entries.filter(e => e.startsWith('paysec-') && e !== 'paysec-upgrade')).toEqual([]);

    // Switch to prefix
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix true`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    entries = fs.readdirSync(skillsDir);
    // Only paysec-* names
    expect(entries.sort()).toEqual([
      'paysec-qa-fix', 'paysec-pr-review', 'paysec-ship-pr', 'paysec-upgrade',
    ]);
    const leaked = entries.filter(e => !e.startsWith('paysec-'));
    expect(leaked).toEqual([]);
  });

  // Test 13: cleans stale symlinks from opposite mode
  test('cleans up stale symlinks from opposite mode', () => {
    setupMockInstall(['qa', 'ship']);
    // Create prefixed symlinks first
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix true`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    expect(fs.existsSync(path.join(skillsDir, 'paysec-qa-fix'))).toBe(true);

    // Switch to flat mode
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix false`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });

    // Flat symlinks should exist, prefixed should be gone
    expect(fs.existsSync(path.join(skillsDir, 'qa'))).toBe(true);
    expect(fs.existsSync(path.join(skillsDir, 'paysec-qa-fix'))).toBe(false);
  });

  // Test 14: error when install dir missing
  test('prints error when install dir missing', () => {
    const output = run(`${BIN}/paysec-relink`, {
      PAYSEC_INSTALL_DIR: '/nonexistent/path/paysec',
      PAYSEC_SKILLS_DIR: '/nonexistent/path/skills',
    }, true);
    expect(output).toContain('setup');
  });

  // Test: paysec-upgrade does NOT get double-prefixed
  test('does not double-prefix paysec-upgrade directory', () => {
    setupMockInstall(['qa', 'ship', 'paysec-upgrade']);
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix true`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    // paysec-upgrade should keep its name, NOT become paysec-paysec-upgrade
    expect(fs.existsSync(path.join(skillsDir, 'paysec-upgrade'))).toBe(true);
    expect(fs.existsSync(path.join(skillsDir, 'paysec-paysec-upgrade'))).toBe(false);
    // Regular skills still get prefixed
    expect(fs.existsSync(path.join(skillsDir, 'paysec-qa-fix'))).toBe(true);
  });

  // Test 15: paysec-config set skill_prefix triggers relink
  test('paysec-config set skill_prefix triggers relink', () => {
    setupMockInstall(['qa', 'ship']);
    // Run paysec-config set which should auto-trigger relink
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix true`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    // If relink was triggered, symlinks should exist
    expect(fs.existsSync(path.join(skillsDir, 'paysec-qa-fix'))).toBe(true);
    expect(fs.existsSync(path.join(skillsDir, 'paysec-ship-pr'))).toBe(true);
  });
});

describe('upgrade migrations', () => {
  const MIGRATIONS_DIR = path.join(ROOT, 'paysec-upgrade', 'migrations');

  test('migrations directory exists', () => {
    expect(fs.existsSync(MIGRATIONS_DIR)).toBe(true);
  });

  test('all migration scripts are executable and parse without syntax errors', () => {
    const scripts = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sh'));
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) {
      const fullPath = path.join(MIGRATIONS_DIR, script);
      // Must be executable
      const stat = fs.statSync(fullPath);
      expect(stat.mode & 0o111).toBeGreaterThan(0);
      // Must parse without syntax errors (bash -n is a syntax check, doesn't execute)
      const result = execSync(`bash -n "${fullPath}" 2>&1`, { encoding: 'utf-8', timeout: 5000 });
      // bash -n outputs nothing on success
    }
  });

  test('migration filenames follow v{VERSION}.sh pattern', () => {
    const scripts = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sh'));
    for (const script of scripts) {
      expect(script).toMatch(/^v\d+\.\d+\.\d+\.\d+\.sh$/);
    }
  });

  test('v0.15.2.0 migration runs paysec-relink', () => {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, 'v0.15.2.0.sh'), 'utf-8');
    expect(content).toContain('paysec-relink');
  });

  test('v0.15.2.0 migration fixes stale directory symlinks', () => {
    setupMockInstall(['qa', 'ship', 'review']);
    // Simulate old state: directory symlinks (pre-v0.15.2.0 pattern)
    fs.symlinkSync(path.join(installDir, 'qa'), path.join(skillsDir, 'qa'));
    fs.symlinkSync(path.join(installDir, 'ship'), path.join(skillsDir, 'ship'));
    fs.symlinkSync(path.join(installDir, 'review'), path.join(skillsDir, 'review'));
    // Set no-prefix mode (suppress auto-relink so symlinks stay intact for the test)
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix false`, {
      PAYSEC_SETUP_RUNNING: '1',
    });
    // Verify old state: symlinks
    expect(fs.lstatSync(path.join(skillsDir, 'qa')).isSymbolicLink()).toBe(true);

    // Run the migration (it calls paysec-relink internally)
    run(`bash ${path.join(MIGRATIONS_DIR, 'v0.15.2.0.sh')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });

    // After migration: real directories with SKILL.md symlinks
    for (const skill of ['qa', 'ship', 'review']) {
      const skillPath = path.join(skillsDir, skill);
      expect(fs.lstatSync(skillPath).isSymbolicLink()).toBe(false);
      expect(fs.lstatSync(skillPath).isDirectory()).toBe(true);
      expect(fs.lstatSync(path.join(skillPath, 'SKILL.md')).isSymbolicLink()).toBe(true);
    }
  });
});

describe('paysec-patch-names (#620/#578)', () => {
  // Helper to read name: from SKILL.md frontmatter
  function readSkillName(skillDir: string): string | null {
    const content = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf-8');
    const match = content.match(/^name:\s*(.+)$/m);
    return match ? match[1].trim() : null;
  }

  test('prefix=true patches name: field in SKILL.md', () => {
    setupMockInstall(['qa', 'ship', 'review']);
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix true`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    // Verify name: field is patched with paysec- prefix
    expect(readSkillName(path.join(installDir, 'qa'))).toBe('paysec-qa-fix');
    expect(readSkillName(path.join(installDir, 'ship'))).toBe('paysec-ship-pr');
    expect(readSkillName(path.join(installDir, 'review'))).toBe('paysec-pr-review');
  });

  test('prefix=false restores name: field in SKILL.md', () => {
    setupMockInstall(['qa', 'ship']);
    // First, prefix them
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix true`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    expect(readSkillName(path.join(installDir, 'qa'))).toBe('paysec-qa-fix');
    // Now switch to flat mode
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix false`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    // Verify name: field is restored to unprefixed
    expect(readSkillName(path.join(installDir, 'qa'))).toBe('qa');
    expect(readSkillName(path.join(installDir, 'ship'))).toBe('ship');
  });

  test('paysec-upgrade name: not double-prefixed', () => {
    setupMockInstall(['qa', 'paysec-upgrade']);
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix true`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    // paysec-upgrade should keep its name, NOT become paysec-paysec-upgrade
    expect(readSkillName(path.join(installDir, 'paysec-upgrade'))).toBe('paysec-upgrade');
    // Regular skill should be prefixed
    expect(readSkillName(path.join(installDir, 'qa'))).toBe('paysec-qa-fix');
  });

  test('SKILL.md without frontmatter is a no-op', () => {
    setupMockInstall(['qa']);
    // Overwrite qa SKILL.md with no frontmatter
    fs.writeFileSync(path.join(installDir, 'qa-fix', 'SKILL.md'), '# qa\nSome content.');
    run(`${path.join(installDir, 'bin', 'paysec-config')} set skill_prefix true`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    // Should not crash
    run(`${path.join(installDir, 'bin', 'paysec-relink')}`, {
      PAYSEC_INSTALL_DIR: installDir,
      PAYSEC_SKILLS_DIR: skillsDir,
    });
    // Content should be unchanged (no name: to patch)
    const content = fs.readFileSync(path.join(installDir, 'qa-fix', 'SKILL.md'), 'utf-8');
    expect(content).toBe('# qa\nSome content.');
  });
});
