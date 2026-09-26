# paysec — Rename Map (DRAFT, edit before applying)

Edit the **New name** column, then tell Claude "rename map approved".
Rules: lowercase, words joined with `-`, no spaces, every name unique.
Avoid Claude Code built-in names: `review`, `code-review`, `security-review`, `init`, `simplify`, `loop`, `schedule`, `run`.

## Global identifiers (applied automatically everywhere)

| Old | New |
|---|---|
| `gstack` (toolkit name) | `paysec` |
| `~/.claude/skills/gstack/` | `~/.claude/skills/paysec/` |
| `~/.gstack/` (config/state dir) | `~/.paysec/` |
| `GSTACK_*` environment variables (175) | `PAYSEC_*` |
| `bin/gstack-*` helper commands | `bin/paysec-*` |
| `browse` binary | `paysec-browse` |
| `(gstack)` tag in skill descriptions | `(paysec)` |

## Skills (55 templates: 54 usable in Claude Code + `claude`, which only runs on non-Claude hosts)

### Router & maintenance
| Old | New name | What it does |
|---|---|---|
| gstack | paysec | Router for the whole suite |
| gstack-upgrade | paysec-upgrade | Upgrade the toolkit (will point at your fork) |

### Planning & product review
| Old | New name | What it does |
|---|---|---|
| office-hours | idea-review | YC-style office hours on an idea |
| spec | write-spec | Turn vague intent into an executable spec |
| autoplan | auto-plan-review | Runs all plan reviews in sequence |
| plan-ceo-review | plan-business-review | CEO/founder-mode plan review |
| plan-eng-review | plan-tech-review | Engineering-manager plan review |
| plan-design-review | plan-ux-review | Designer plan review |
| plan-devex-review | plan-dx-review | Developer-experience plan review |
| plan-tune | tune-questions | Tunes how many questions skills ask |

### Code review, debugging, shipping
| Old | New name | What it does |
|---|---|---|
| review | pr-review | Pre-landing PR review |
| investigate | debug-root-cause | Systematic root-cause debugging |
| health | code-health | Code quality dashboard |
| cso | security-audit | Chief Security Officer mode |
| codex | codex-second-opinion | OpenAI Codex CLI wrapper |
| claude | claude-second-opinion | Claude CLI wrapper (non-Claude hosts only) |
| ship | ship-pr | Tests, review, version bump, changelog, PR |
| land-and-deploy | merge-and-deploy | Merge and deploy workflow |
| landing-report | merge-queue-report | Read-only merge queue dashboard |
| setup-deploy | deploy-setup | Configure deploy settings |
| canary | post-deploy-monitor | Post-deploy canary monitoring |
| benchmark | perf-check | Performance regression detection |
| benchmark-models | model-benchmark | Cross-model benchmark of skills |
| document-generate | docs-generate | Generate missing documentation |
| document-release | docs-release-update | Post-ship documentation update |
| retro | weekly-retro | Weekly engineering retrospective |

### Testing, browser, reports  (used by the certification framework ★)
| Old | New name | What it does |
|---|---|---|
| browse ★ | browser | Headless browser for QA / automation |
| qa ★ | qa-fix | QA test a web app and fix bugs |
| qa-only | qa-report | QA test, report only |
| make-pdf ★ | md-to-pdf | Markdown to publication-quality PDF |
| setup-browser-cookies ★ | import-browser-cookies | Import cookies from your real Chrome |
| open-gstack-browser (+ alias connect-chrome) | open-paysec-browser | Launch the AI-controlled Chromium |
| scrape | web-scrape | Pull data from a web page |
| skillify | save-scrape-skill | Save a scrape flow as a reusable skill |
| pair-agent | pair-remote-agent | Pair a remote agent with your browser |
| diagram | make-diagram | Text/mermaid to Excalidraw + SVG/PNG |

### Design
| Old | New name | What it does |
|---|---|---|
| design-consultation | design-system | Propose a full design system |
| design-shotgun | design-variants | Generate and compare design variants |
| design-html | design-to-html | Production HTML/CSS from a design |
| design-review | design-qa | Visual QA + fixes |
| devex-review | dx-audit | Live developer-experience audit |

### iOS
| Old | New name | What it does |
|---|---|---|
| ios-qa | ios-device-qa | Live-device QA for SwiftUI apps |
| ios-fix | ios-auto-fix | Autonomous iOS bug fixer |
| ios-design-review | ios-design-audit | Visual design audit on device |
| ios-clean | ios-remove-debug | Remove the debug bridge |
| ios-sync | ios-bridge-sync | Regenerate the debug bridge |

### Safety guardrails
| Old | New name | What it does |
|---|---|---|
| careful | safe-mode | Warn before destructive commands |
| freeze | lock-edits | Restrict edits to one directory |
| unfreeze | unlock-edits | Remove the edit restriction |
| guard | full-guard | safe-mode + lock-edits together |

### Context & memory
| Old | New name | What it does |
|---|---|---|
| context-save | save-context | Save working context |
| context-restore | restore-context | Restore saved context |
| learn | learnings | Manage project learnings |
| setup-gbrain | brain-setup | Set up gbrain |
| sync-gbrain | brain-sync | Keep gbrain in sync with the repo |

## Certification framework references that will be updated to match
`/browse` → `/browser` · `/qa` → `/qa-fix` · `/make-pdf` → `/md-to-pdf` · `/setup-browser-cookies` → `/import-browser-cookies` · `/plan-ceo-review` → `/plan-business-review` · `/plan-eng-review` → `/plan-tech-review`
