/**
 * /docs-release-update + /docs-generate redaction wiring (T6/T7).
 */
import { describe, test, expect } from "bun:test";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(import.meta.dir, "..");
// docs-release-update is carved (skeleton + sections/release-body.md). Step 9
// (commit + PR-body redaction scan) moved into the section template; check the
// union of SKILL.md.tmpl + sections/*.md.tmpl so the scan-before-edit ordering
// still verifies. docs-generate is NOT carved (plain .md.tmpl).
function unionTmpl(skill: string): string {
  let t = fs.readFileSync(path.join(ROOT, skill, "SKILL.md.tmpl"), "utf-8");
  const dir = path.join(ROOT, skill, "sections");
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).sort()) {
      if (f.endsWith(".md.tmpl")) t += "\n" + fs.readFileSync(path.join(dir, f), "utf-8");
    }
  }
  return t;
}
const RELEASE = unionTmpl("docs-release-update");
const GENERATE = fs.readFileSync(path.join(ROOT, "docs-generate", "SKILL.md.tmpl"), "utf-8");

describe("/docs-release-update redaction", () => {
  test("scans the PR-body temp file before gh pr edit", () => {
    const scanIdx = RELEASE.indexOf("paysec-redact --from-file /tmp/paysec-pr-body");
    const editIdx = RELEASE.indexOf("gh pr edit --body-file /tmp/paysec-pr-body");
    expect(scanIdx).toBeGreaterThan(-1);
    expect(editIdx).toBeGreaterThan(scanIdx);
  });
  test("HIGH blocks the edit", () => {
    expect(RELEASE).toMatch(/exit 3 \(HIGH\).*do NOT edit/i);
  });
});

describe("/docs-generate redaction", () => {
  test("scans staged doc diff before commit", () => {
    const scanIdx = GENERATE.indexOf("paysec-redact --repo-visibility");
    const commitIdx = GENERATE.indexOf("git commit -m");
    expect(scanIdx).toBeGreaterThan(-1);
    expect(commitIdx).toBeGreaterThan(scanIdx);
  });
  test("scans added lines of the staged diff", () => {
    expect(GENERATE).toMatch(/git diff --cached[\s\S]{0,80}paysec-redact/);
  });
  test("HIGH blocks the commit", () => {
    expect(GENERATE).toMatch(/Do NOT commit/i);
  });
});
