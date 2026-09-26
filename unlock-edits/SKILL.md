---
name: unlock-edits
version: 0.1.0
description: Clear the freeze boundary set by /lock-edits, allowing edits to all directories again. (paysec)
triggers:
  - unlock-edits edits
  - unlock all directories
  - remove edit restrictions
allowed-tools:
  - Bash
  - Read
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->


## When to invoke this skill

Use when you want to widen edit scope without ending the session.
Use when asked to "unlock-edits", "unlock edits", "remove freeze", or
"allow all edits".

# /unlock-edits — Clear Freeze Boundary

Remove the edit restriction set by `/lock-edits`, allowing edits to all directories.

```bash
mkdir -p ~/.paysec/analytics
echo '{"skill":"unlock-edits","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.paysec/analytics/skill-usage.jsonl 2>/dev/null || true
```

## Clear the boundary

```bash
eval "$(~/.claude/skills/paysec/bin/paysec-paths)"
STATE_DIR="$PAYSEC_STATE_ROOT"
if [ -f "$STATE_DIR/freeze-dir.txt" ]; then
  PREV=$(cat "$STATE_DIR/freeze-dir.txt")
  rm -f "$STATE_DIR/freeze-dir.txt"
  echo "Freeze boundary cleared (was: $PREV). Edits are now allowed everywhere."
else
  echo "No freeze boundary was set."
fi
```

Tell the user the result. Note that `/lock-edits` hooks are still registered for the
session — they will just allow everything since no state file exists. To re-freeze,
run `/lock-edits` again.
