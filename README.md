# paysec

paysec is a team toolkit of Claude Code skills plus a fast headless browser, used for engineering workflows and for the Enterprise Certification Framework.

It is a fork of [gstack](https://github.com/garrytan/gstack) by Garry Tan (MIT), taken at v1.67.1.0. Differences from upstream:

- **Renamed.** Toolkit `gstack` → `paysec`, config dir `~/.gstack` → `~/.paysec`, env vars `GSTACK_*` → `PAYSEC_*`, helpers `gstack-*` → `paysec-*`, and every skill has a new name (table below).
- **No telemetry.** The upstream Supabase URL and key are removed; nothing is uploaded. First-run no longer asks to share usage data.
- **No upstream pulls.** Install, update check and `/paysec-upgrade` never contact `garrytan/gstack`. They use your own fork via `PAYSEC_REMOTE_REPO` / `PAYSEC_REMOTE_URL`.

The original upstream README is kept at [docs/UPSTREAM-README.md](docs/UPSTREAM-README.md).

## Install

Requirements: git, [bun](https://bun.sh) 1.3+, Node.js 18+.

```bash
git clone <your-paysec-repo-url> ~/.claude/skills/paysec
cd ~/.claude/skills/paysec && ./setup
```

`setup` builds the browser binary, downloads Chromium and links the skills into Claude Code.

To enable update checks and `/paysec-upgrade`, set in your shell profile:

```bash
export PAYSEC_REMOTE_REPO="<your-paysec-repo-url>"                              # git URL
export PAYSEC_REMOTE_URL="<raw URL of VERSION on your repo's main branch>"
```

## Skills

| Skill | What it does | Upstream name |
|---|---|---|
| `/paysec` | Router for the suite | gstack |
| `/paysec-upgrade` | Upgrade from your fork | gstack-upgrade |
| `/idea-review` | Office-hours session on an idea | office-hours |
| `/write-spec` | Turn vague intent into an executable spec | spec |
| `/auto-plan-review` | Run all plan reviews in sequence | autoplan |
| `/plan-business-review` | Business/founder plan review | plan-ceo-review |
| `/plan-tech-review` | Engineering plan review | plan-eng-review |
| `/plan-ux-review` | Design plan review | plan-design-review |
| `/plan-dx-review` | Developer-experience plan review | plan-devex-review |
| `/tune-questions` | Tune how many questions skills ask | plan-tune |
| `/pr-review` | Pre-landing PR review | review |
| `/debug-root-cause` | Systematic root-cause debugging | investigate |
| `/code-health` | Code quality dashboard | health |
| `/security-audit` | Security officer review | cso |
| `/codex-second-opinion` | Second opinion from OpenAI Codex | codex |
| `/claude-second-opinion` | Second opinion from Claude (non-Claude hosts only) | claude |
| `/ship-pr` | Test, review, bump version, create PR | ship |
| `/merge-and-deploy` | Merge and deploy | land-and-deploy |
| `/merge-queue-report` | Merge queue dashboard | landing-report |
| `/deploy-setup` | Configure deployment settings | setup-deploy |
| `/post-deploy-monitor` | Post-deploy canary monitoring | canary |
| `/perf-check` | Performance regression detection | benchmark |
| `/model-benchmark` | Compare AI models on skills | benchmark-models |
| `/docs-generate` | Generate missing documentation | document-generate |
| `/docs-release-update` | Post-release documentation update | document-release |
| `/weekly-retro` | Weekly engineering retrospective | retro |
| `/browser` | Headless browser for QA and automation | browse |
| `/qa-fix` | QA test a web app and fix bugs | qa |
| `/qa-report` | QA test, report only | qa-only |
| `/md-to-pdf` | Markdown to PDF | make-pdf |
| `/import-browser-cookies` | Import logins from your real Chrome | setup-browser-cookies |
| `/open-paysec-browser` (alias `/connect-chrome`) | Open the AI-controlled browser | open-gstack-browser |
| `/web-scrape` | Pull data from a web page | scrape |
| `/save-scrape-skill` | Save a scrape as a reusable skill | skillify |
| `/pair-remote-agent` | Let a remote agent use your browser | pair-agent |
| `/make-diagram` | Text to diagram (Excalidraw/SVG/PNG) | diagram |
| `/design-system` | Propose a full design system | design-consultation |
| `/design-variants` | Generate and compare design options | design-shotgun |
| `/design-to-html` | Design to production HTML/CSS | design-html |
| `/design-qa` | Visual design QA and fixes | design-review |
| `/dx-audit` | Live developer-experience audit | devex-review |
| `/ios-device-qa` | QA on a real iPhone | ios-qa |
| `/ios-auto-fix` | Autonomous iOS bug fixing | ios-fix |
| `/ios-design-audit` | iOS visual design audit | ios-design-review |
| `/ios-remove-debug` | Remove the iOS debug bridge | ios-clean |
| `/ios-bridge-sync` | Regenerate the iOS debug bridge | ios-sync |
| `/safe-mode` | Warn before destructive commands | careful |
| `/lock-edits` | Allow edits in one folder only | freeze |
| `/unlock-edits` | Remove the folder restriction | unfreeze |
| `/full-guard` | safe-mode + lock-edits | guard |
| `/save-context` | Save working context | context-save |
| `/restore-context` | Restore saved context | context-restore |
| `/learnings` | Manage project learnings | learn |
| `/brain-setup` | Set up gbrain | setup-gbrain |
| `/brain-sync` | Keep gbrain in sync | sync-gbrain |

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
