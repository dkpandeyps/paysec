# paysec

paysec is a team toolkit of Claude Code skills plus a fast headless browser, used for engineering workflows and for the Enterprise Certification Framework.

- **No telemetry.** Nothing is uploaded; first run never asks to share usage data.
- **Your repository only.** Install, update check and `/paysec-upgrade` use your own repository via `PAYSEC_REMOTE_REPO` / `PAYSEC_REMOTE_URL`.
  

## Install

Requirements: git, [bun](https://bun.sh) 1.3+, Node.js 18+.

```bash
git clone https://github.com/dkpandeyps/paysec.git ~/.claude/skills/paysec
cd ~/.claude/skills/paysec && ./setup
```

`setup` builds the browser binary, downloads Chromium and links the skills into Claude Code.

To enable update checks and `/paysec-upgrade`, set in your shell profile:

```bash
export PAYSEC_REMOTE_REPO="https://github.com/dkpandeyps/paysec.git"                  # git URL
export PAYSEC_REMOTE_URL="https://raw.githubusercontent.com/dkpandeyps/paysec/main/VERSION"
```

## Skills

| Skill | What it does |
|---|---|
| `/paysec` | Router for the suite |
| `/paysec-upgrade` | Upgrade from your repository |
| `/idea-review` | Office-hours session on an idea |
| `/write-spec` | Turn vague intent into an executable spec |
| `/auto-plan-review` | Run all plan reviews in sequence |
| `/plan-business-review` | Business/founder plan review |
| `/plan-tech-review` | Engineering plan review |
| `/plan-ux-review` | Design plan review |
| `/plan-dx-review` | Developer-experience plan review |
| `/tune-questions` | Tune how many questions skills ask |
| `/pr-review` | Pre-landing PR review |
| `/debug-root-cause` | Systematic root-cause debugging |
| `/code-health` | Code quality dashboard |
| `/security-audit` | Security officer review |
| `/codex-second-opinion` | Second opinion from OpenAI Codex |
| `/claude-second-opinion` | Second opinion from Claude (non-Claude hosts only) |
| `/ship-pr` | Test, review, bump version, create PR |
| `/merge-and-deploy` | Merge and deploy |
| `/merge-queue-report` | Merge queue dashboard |
| `/deploy-setup` | Configure deployment settings |
| `/post-deploy-monitor` | Post-deploy canary monitoring |
| `/perf-check` | Performance regression detection |
| `/model-benchmark` | Compare AI models on skills |
| `/docs-generate` | Generate missing documentation |
| `/docs-release-update` | Post-release documentation update |
| `/weekly-retro` | Weekly engineering retrospective |
| `/browser` | Headless browser for QA and automation |
| `/qa-fix` | QA test a web app and fix bugs |
| `/qa-report` | QA test, report only |
| `/md-to-pdf` | Markdown to PDF |
| `/import-browser-cookies` | Import logins from your real Chrome |
| `/open-paysec-browser` (alias `/connect-chrome`) | Open the AI-controlled browser |
| `/web-scrape` | Pull data from a web page |
| `/save-scrape-skill` | Save a scrape as a reusable skill |
| `/pair-remote-agent` | Let a remote agent use your browser |
| `/make-diagram` | Text to diagram (Excalidraw/SVG/PNG) |
| `/design-system` | Propose a full design system |
| `/design-variants` | Generate and compare design options |
| `/design-to-html` | Design to production HTML/CSS |
| `/design-qa` | Visual design QA and fixes |
| `/dx-audit` | Live developer-experience audit |
| `/ios-device-qa` | QA on a real iPhone |
| `/ios-auto-fix` | Autonomous iOS bug fixing |
| `/ios-design-audit` | iOS visual design audit |
| `/ios-remove-debug` | Remove the iOS debug bridge |
| `/ios-bridge-sync` | Regenerate the iOS debug bridge |
| `/safe-mode` | Warn before destructive commands |
| `/lock-edits` | Allow edits in one folder only |
| `/unlock-edits` | Remove the folder restriction |
| `/full-guard` | safe-mode + lock-edits |
| `/save-context` | Save working context |
| `/restore-context` | Restore saved context |
| `/learnings` | Manage project learnings |
| `/brain-setup` | Set up gbrain |
| `/brain-sync` | Keep gbrain in sync |

## Development

```bash
bun install
bun run gen:skill-docs --host all   # regenerate SKILL.md from .tmpl templates
bun run build                       # compile browser, design, md-to-pdf binaries
bun run test:windows                # Windows-safe free test suite (bun run test elsewhere)
```

Edit `*.tmpl` files, never generated `SKILL.md` files.

## License

MIT. Copyright (c) 2026 Garry Tan; paysec modifications Copyright (c) 2026 DKPandey. See [LICENSE](LICENSE).
