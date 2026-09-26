import type { TemplateContext } from './types';

/**
 * {{TEST_CASE_REGISTER:<mode>}} — every run of a testing skill records each test case it executes and
 * ends with a Test Case Register (Markdown + PDF) built by bin/paysec-test-register.
 *
 * Modes:
 *   web     — browser-driven testing skills (/qa-report, /qa-fix, /design-qa, /perf-check,
 *             /post-deploy-monitor, /dx-audit): one record per page/flow/form/check.
 *   code    — skills that run the project's automated test suite (/ship-pr): import the runner's
 *             JUnit XML, fall back to one record per test file/suite.
 *   review  — /pr-review: one record per review check category, plus automated tests if they ran.
 */
export function generateTestCaseRegister(ctx: TemplateContext, args?: string[]): string {
  const mode = (args?.[0] ?? 'web').trim();
  const bin = `${ctx.paths.binDir}/paysec-test-register`;
  const skill = ctx.skillName;

  const start = `### 1. Start the register (once, before the first test)

\`\`\`bash
${bin} start ${skill} "<target: URL, page, or branch>"
\`\`\`

It prints a run directory such as \`.paysec/test-registers/${skill}-20260925-101500\`. Shell variables do not survive
between commands, so reuse that exact path literally as \`<run_dir>\` in every later register command.`;

  const record = `### 2. Record every test case as you go (pass AND fail)

\`\`\`bash
${bin} add <run_dir> '{"id":"TC-001","module":"<page or area>","target":"<field, element or flow>","type":"<positive|negative|boundary|visual|performance|...>","title":"<what is being checked>","input":"<data entered or steps>","expected":"<expected outcome>","actual":"<what actually happened>","result":"pass|fail|skipped|blocked","severity":"<critical|high|medium|low, failures only>","evidence":"<screenshot path>"}'
\`\`\`

- One record per test case, check or scenario — **including every passing one**. The register is only complete if passes are recorded too.
- Several cases can be sent at once as a JSON array.
- Use \`skipped\` for tests you intentionally did not run (say why in \`notes\`) and \`blocked\` when something prevented the test.
- Never put real passwords, tokens or cookies in any field. Write \`[REDACTED]\`. The helper also redacts secrets and masks values typed into password fields, but do not rely on that.`;

  const codeImport = `### 2. Record the automated test results

Run the project's test suite so it also writes a **JUnit XML** report, then import it. Every test case is listed:

| Runner | Command addition |
|---|---|
| pytest | \`--junitxml=<run_dir>/junit.xml\` |
| vitest | \`--reporter=default --reporter=junit --outputFile=<run_dir>/junit.xml\` |
| bun test | \`--reporter=junit --reporter-outfile=<run_dir>/junit.xml\` |
| jest | \`--reporters=default --reporters=jest-junit\` (needs \`jest-junit\`; output \`junit.xml\`) |
| mocha | \`--reporter mocha-junit-reporter\` (needs the package) |
| go test | \`go test -v ./... 2>&1 \\| go-junit-report > <run_dir>/junit.xml\` (needs go-junit-report) |
| Maven / Gradle | reports already in \`target/surefire-reports/*.xml\` / \`build/test-results/**/*.xml\` |

\`\`\`bash
${bin} import-junit <run_dir> <path/to/junit.xml> "<suite name, e.g. Unit tests>"
\`\`\`

Import each XML file if there are several. If the runner cannot produce JUnit XML, record **one case per test file or
suite** from the runner output with \`add\` (result pass/fail and the failing test names in \`actual\`), and say in the
final report that per-test detail was not available.`;

  const reviewRecord = `### 2. Record every review check

Record one case per check you performed, pass or fail. Use \`"type":"review-check"\`, \`module\` = the checklist
area, \`title\` = the check, \`actual\` = finding or "no issues", \`evidence\` = file:line:

- SQL and data safety
- race conditions
- LLM trust boundaries
- shell injection
- enum completeness
- conditional side effects
- test coverage
- scope drift
- documentation staleness

Also record each finding you fixed or flagged:

\`\`\`bash
${bin} add <run_dir> '{"id":"RV-001","module":"SQL & data safety","type":"review-check","title":"queries parameterised","expected":"no injection risk","actual":"no issues","result":"pass","evidence":"app/models/user.rb"}'
\`\`\`

If you ran the project's automated tests during this review, also import their JUnit XML:
\`${bin} import-junit <run_dir> <junit.xml> "Automated tests"\`.`;

  const finish = `### 3. Build the register (always, at the end, even if the run failed or recorded nothing)

\`\`\`bash
${bin} build <run_dir>
\`\`\`

It prints \`REGISTER_MD:\`, \`REGISTER_PDF:\` and \`REGISTER_TOTALS:\`. **Include the PDF path and the totals line in your
final report.** If the PDF step fails, give the Markdown path and the reason printed. \`${bin} show <run_dir>\` prints
totals at any time.`;

  const intro = `## Test Case Register (required for every run)

Every run of /${skill} produces a **Test Case Register**: a PDF listing every test case executed. Each row shows the
ID, module, scenario, input, expected, actual, result and evidence, with a summary and a list of failures first.
Other reports summarise; the register is complete.`;

  const middle = mode === 'code' ? codeImport : mode === 'review' ? reviewRecord : record;
  return [intro, start, middle, finish].join('\n\n');
}
