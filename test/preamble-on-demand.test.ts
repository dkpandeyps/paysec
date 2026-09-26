/**
 * On-demand preamble sections (scripts/resolvers/preamble/on-demand.ts).
 *
 * One-time onboarding flows render as a gate pointer on Claude and inline on
 * every other host. Pins: the pointer's gate + path, that the generated file
 * carries the exact body the section used to inline, that other hosts still
 * inline it, and that every pointer in a generated SKILL.md resolves.
 */
import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import type { TemplateContext } from '../scripts/resolvers/types';
import { HOST_PATHS } from '../scripts/resolvers/types';
import {
  ON_DEMAND_SECTIONS, onDemandSectionRelPath, renderOnDemand, renderOnDemandFile,
} from '../scripts/resolvers/preamble/on-demand';

const ROOT = path.resolve(import.meta.dir, '..');

function ctx(host: 'claude' | 'codex'): TemplateContext {
  return { skillName: 'test-skill', tmplPath: 'test.tmpl', host, paths: HOST_PATHS[host], preambleTier: 3 };
}

describe('on-demand preamble sections', () => {
  for (const s of ON_DEMAND_SECTIONS) {
    test(`${s.id}: Claude gets a gate pointer, the file carries the full body`, () => {
      const pointer = renderOnDemand(ctx('claude'), s.id);
      expect(pointer).toContain(`If ${s.gate}: Read \`~/.claude/skills/paysec/${onDemandSectionRelPath(s.id)}\``);
      const body = s.render(ctx('claude'));
      expect(pointer.length).toBeLessThan(body.length);

      const file = fs.readFileSync(path.join(ROOT, onDemandSectionRelPath(s.id)), 'utf-8');
      expect(file).toBe(renderOnDemandFile(ctx('claude'), s.id)); // fresh
      expect(file).toContain(body);
    });

    test(`${s.id}: non-Claude hosts keep the body inline`, () => {
      const out = renderOnDemand(ctx('codex'), s.id);
      expect(out).toBe(s.render(ctx('codex')));
      expect(out).not.toContain('preamble/sections/');
    });
  }

  test('every on-demand pointer in a generated Claude SKILL.md resolves to a file', () => {
    let pointers = 0;
    for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const md = path.join(ROOT, entry.name, 'SKILL.md');
      if (!fs.existsSync(md)) continue;
      for (const m of fs.readFileSync(md, 'utf-8').matchAll(/~\/\.claude\/skills\/paysec\/(preamble\/sections\/[a-z-]+\.md)/g)) {
        pointers++;
        expect(fs.existsSync(path.join(ROOT, m[1])), `${entry.name}/SKILL.md -> ${m[1]}`).toBe(true);
      }
    }
    expect(pointers).toBeGreaterThan(0);
  });
});
